import React, { useRef, useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';

const ObjectDetection = ({ videoRef }) => {
  const canvasRef = useRef(null);
  const [session, setSession] = useState(null);
  let lastProcessedTime = Date.now();
  const processInterval = 100; // milliseconds

  // Load the model asynchronously when the component mounts
  useEffect(() => {
    async function loadModel() {
      try {
        
        ort.env.wasm.wasmPaths = {
          'ort-wasm-simd.wasm': '/wasm/ort-wasm-simd.wasm',
          'ort-wasm.wasm': 'wasm/ort-wasm.wasm',
        };

        const modelPath = `/models/yolov9-c.onnx`;
        const loadedSession = await ort.InferenceSession.create(modelPath);
        
        setSession(loadedSession);
       
      } catch (error) {
        console.error('Failed to load the model', error);
      }
    }
    loadModel();
  }, []);
  
  const workerRef = useRef(null);

    useEffect(() => {
        // Load the worker
        if (typeof Worker !== 'undefined') {
            workerRef.current = new Worker('/worker.js');

            workerRef.current.onmessage = (e) => {
                const { output } = e.data;
                console.log('Received from worker:', output);
                // Process output here, e.g., draw bounding boxes
            };

            workerRef.current.onerror = (error) => {
                console.error('Worker error:', error);
            };
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // Function to capture frames and send them to the worker
    const processVideoFrame = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const imageData = ctx.getImageData(0, 0, 640, 480);

        // Send imageData to worker
        workerRef.current.postMessage({
            imageData: imageData.data.buffer, // Transfer imageData as a buffer to avoid cloning costs
            modelPath: '/models/yolov9.onnx'
        }, [imageData.data.buffer]);
    };

    // You can set up a timer or event listener to call this method
    setInterval(processVideoFrame, 100);


  // Preprocess the video frame
  const preprocess = (imageData) => {
    const targetSize = 416; // Match this to your model's expected input size
    const { data, width, height } = resizeImageData(imageData, targetSize, targetSize);
    const inputTensor = new Float32Array(targetSize * targetSize * 3);
    for (let i = 0; i < width * height * 4; i += 4) {
      inputTensor[i / 4 * 3] = data[i] / 255;     // R
      inputTensor[i / 4 * 3 + 1] = data[i + 1] / 255; // G
      inputTensor[i / 4 * 3 + 2] = data[i + 2] / 255; // B
    }
    return new ort.Tensor("float32", inputTensor, [1, 3, targetSize, targetSize]);
  };

  // Resize image data to a specified width and height
  const resizeImageData = (imageData, width, height) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);
    ctx.drawImage(canvas, 0, 0, imageData.width, imageData.height, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  };

  // Drawing bounding boxes
  function drawRect(context, detection) {
    const { x, y, width, height, class: className, confidence } = detection;
    const scale = canvasRef.current.width / 416;  // Adjust 416 to your model's input size if different
  
    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.strokeRect(x * scale, y * scale, width * scale, height * scale);
    context.fillStyle = 'red';
    context.fillText(`${className} ${confidence.toFixed(2)}`, x * scale, (y * scale) - 10);
  }
  

  // A utility function to apply non-maximum suppression
function nonMaxSuppression(boxes, scores, iouThreshold) {
  // This function assumes boxes in format [x, y, width, height] and scores are the confidences
  const pickedBoxes = [];

  // Sort box indices by scores in descending order
  let indices = scores.map((score, index) => [score, index]).sort(([a], [b]) => b - a).map(([, index]) => index);

  while (indices.length > 0) {
    const currentIdx = indices.shift();
    const currentBox = boxes[currentIdx];

    pickedBoxes.push(currentBox);

    // Filter out indices of boxes that overlap significantly with the current box
    indices = indices.filter((idx) => {
      const box = boxes[idx];
      const intersectionArea = Math.max(0, Math.min(currentBox[0] + currentBox[2], box[0] + box[2]) - Math.max(currentBox[0], box[0])) *
                                Math.max(0, Math.min(currentBox[1] + currentBox[3], box[1] + box[3]) - Math.max(currentBox[1], box[1]));

      const currentArea = currentBox[2] * currentBox[3];
      const area = box[2] * box[3];
      const unionArea = currentArea + area - intersectionArea;
      return intersectionArea / unionArea > iouThreshold;
    });
  }

  return pickedBoxes;
}

async function postprocess(tensor, threshold = 0.5, iouThreshold = 0.5) {
  const detections = [];
  const data = tensor.data;
  const numDetections = tensor.dims[1]; // Adjust depending on how the data is structured

  for (let i = 0; i < numDetections; i++) {
    const baseIndex = i * 6; // Adjust this base on your model's output tensor structure
    const confidence = data[baseIndex + 4];

    if (confidence > threshold) {
      const x = data[baseIndex];
      const y = data[baseIndex + 1];
      const width = data[baseIndex + 2];
      const height = data[baseIndex + 3];
      const classId = data[baseIndex + 5];

      detections.push({
        x, y, width, height,
        class: `Class_${classId}`, // Map this to actual class names if available
        confidence
      });
    }
  }

  // Apply non-maximum suppression to reduce overlaps
  const boxes = detections.map(det => [det.x, det.y, det.width, det.height]);
  const scores = detections.map(det => det.confidence);
  const pickedBoxes = nonMaxSuppression(boxes, scores, iouThreshold);

  return pickedBoxes.map((box, i) => ({ ...box, class: detections[i].class, confidence: detections[i].confidence }));

}


  // Frame processing for object detection
  useEffect(() => {
    const processFrame = async () => {

      const currentTime = Date.now();
      if (currentTime - lastProcessedTime < processInterval) {
        requestAnimationFrame(processFrame);
        return;
      }
      lastProcessedTime = currentTime;


      if (!videoRef.current || !session || !canvasRef.current) return;

      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const inputTensor = preprocess(imageData);
      console.log("done1")

      console.log("input tensor: ", inputTensor)

      const output = await session.run({ [session.inputNames[0]]: inputTensor });
      console.log("done2")
      const outputTensor = output[session.outputNames[0]]; // Assumes 'output0' is the correct key
      console.log("output tensor: ", outputTensor)
      // Post-processing to extract and draw bounding boxes (assuming postprocess function exists and works correctly)
      var detections = await postprocess(outputTensor);
      
      
      (detections).forEach(det => drawRect(context, det));
      console.log("done4")
      console.log("detections: ", detections)

      requestAnimationFrame(processFrame); // Continue the loop
    };

    processFrame();
  }, [videoRef, session]); // Dependency array to avoid unnecessary re-renders

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }} width="640" height="480"></canvas>;
};

export default ObjectDetection;
