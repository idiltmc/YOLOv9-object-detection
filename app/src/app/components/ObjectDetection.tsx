import React, { useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';

const ObjectDetection = ({ inputData , canvas, setProgress}) => {
    const [session, setSession] = useState(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [detectionMade, setDetectionMade] = useState(false);

    // Load the model asynchronously when the component mounts
    useEffect(() => {
        async function loadModel() {

            //initilize the backend for the ONNX
            try {
                ort.env.wasm.wasmPaths = {
                    'ort-wasm-simd.wasm': '/wasm/ort-wasm-simd.wasm',
                    'ort-wasm.wasm': '/wasm/ort-wasm.wasm',
                };

                //get the model and load as the session
                const modelPath = `/models/yolo_post_640x640.onnx`;
                const loadedSession = await ort.InferenceSession.create(modelPath);
                setSession(loadedSession);
                setProgress(33)
                setModelLoaded(true);
            } catch (error) {
                console.error('Failed to load the model:', error);
            }
        }
        loadModel();
    }, []);

    useEffect(() => {
      async function runDetection() {
          if (modelLoaded && inputData && session) {
              try {

                  console.log("given input data is ", inputData) //check if the input data is initinized properly
                  setProgress(66) //set the progress


                  //feed the input into the model
                  const feeds = { images: inputData }; 
                  const output = await session.run(feeds);
               
                  //extract the prediction and confidence from the output and draw the results to the cnavas
                  const detections = processDetections(output);
                   drawDetection(canvas.current, detections)

                  
              } catch (error) {
                  console.error('Error running detection:', error);
              }
          }
      }
  
      runDetection();
  }, [inputData, modelLoaded, session]);


  // Extract the outputs of the model to somethign meaningfull
  function processDetections(output) {

    //extract the output
    const scores = output.score.data; // corresponding confidence for the classes in the above output
    const detections = output.batchno_classid_x1y1x2y2.data; // we have the format [0 class_name x1 y1 x2 y2]
    const formattedDetections = [];

    for (let i = 0; i < scores.length; i++) {
        const score = scores[i];
        const index = i * 6;
        const batchId = detections[index];
        const classId = detections[index + 1];
        const bbox = {
            x1: detections[index + 2],
            y1: detections[index + 3],
            x2: detections[index + 4],
            y2: detections[index + 5]
        };

        if (score > 0.5) { // Confidence threshold
            const className = COCO_CLASSES[classId]; //find the actual class name using the class id
            formattedDetections.push({
                batchId,
                classId,
                className,
                bbox,
                score
            });
        }
    }
    return formattedDetections;
}



function drawDetection(canvas, detections) {
 
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    //extract the box values
    const {x1, y1, x2, y2} = detections[0].bbox;

    const x1_ = Number(x1);
    const y1_ = Number(y1);
    const x2_ = Number(x2);
    const y2_ = Number(y2);

    //prepare the text (containes the class name and the confidance rate)
    const text = `${detections[0].className} (${(detections[0].score * 100).toFixed(1)}%)`;

    console.log("SCORE IS: ", text)
    setDetectionMade(true)
    setProgress(100)

    drawRect(ctx, x1_,y1_,x2_,y2_,text, "#FF0000")

    
}


//using the infromation, draw it into the canvas
function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text = "", color = "red") {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.rect(x, y, w, h);
    ctx.stroke();
  
    if (text) {
      ctx.fillStyle = color;
      ctx.font = "40px Arial";
      ctx.fillText(text, x + 15, y + 45);
    }
  }
  

// Classes to extract the actual class name in the given id (following COCO convention)
const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane",
  "bus", "train", "truck", "boat", "traffic light",
  "fire hydrant", "stop sign", "parking meter", "bench", "bird",
  "cat", "dog", "horse", "sheep", "cow",
  "elephant", "bear", "zebra", "giraffe", "backpack",
  "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat",
  "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
  "wine glass", "cup", "fork", "knife", "spoon",
  "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut",
  "cake", "chair", "sofa", "pottedplant", "bed",
  "diningtable", "toilet", "tvmonitor", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven",
  "toaster", "sink", "refrigerator", "book", "clock",
  "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

    return <h2>{modelLoaded ? (detectionMade ? "Detection is made...": 'Model loaded, detecting objects...') : 'Loading model...'}</h2>;
};

export default ObjectDetection;
