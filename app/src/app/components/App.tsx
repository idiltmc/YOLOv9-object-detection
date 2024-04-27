"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import "./App.css";
import { Progress } from "@/components/ui/progress"
import ObjectDetection from './ObjectDetection';
import { Upload } from 'lucide-react';
import ndarray from 'ndarray';
import ops from 'ndarray-ops';
import * as ort from 'onnxruntime-web';

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false); // Track camera state
  // Set the dark mode
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      if (darkMode) {
        container.classList.add('dark');
      } else {
        container.classList.remove('dark');
      }
    }
  }, [darkMode]);

  // Upload image
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputData, setInputData] = useState(null);

    const uploadImage = (file) => {

    if (file && file.type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        // Check if result is a string before assigning it
        if (typeof e.target?.result === 'string') {
          setImageSrc(e.target.result);
        } else {
          console.error('Expected a string, but received a different type');
        }
      };
      reader.readAsDataURL(file);
    }
  };


    // Toggle webcam on/off
  const toggleCamera = () => {
    if (!isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setIsCameraOn(true);
        })
        .catch(err => {
          console.error("Something went wrong!", err);
        });
    } else {
      const tracks = videoRef.current?.srcObject?.getTracks();
      tracks?.forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  };


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file =  event.target.files && event.target.files[0];
    if (!file) return;

    uploadImage(file)

    console.log("is canvas be set? ", canvasRef.current)
    
    const canvas = canvasRef.current;

    console.log('canvas dimensions w:', canvas?.width, " h: ", canvas?.height)
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Resize image
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log("draw the image to canvas")
      processImageData(imageData);
      
    };
  };



  function processImageData(imageData) {
    const { data, width, height } = imageData;
    
    // Create an ndarray for RGBA
    const dataTensor = ndarray(new Float32Array(data), [height, width, 4]);

    // get rid of the alpha in RGBA (we do not have to work with the transparency)
    const dataProcessedTensor = ndarray(new Float32Array(width * height * 3), [1, 3, height, width]);
    ops.assign(dataProcessedTensor.pick(0, 0), dataTensor.pick(null, null, 0));
    ops.assign(dataProcessedTensor.pick(0, 1), dataTensor.pick(null, null, 1));
    ops.assign(dataProcessedTensor.pick(0, 2), dataTensor.pick(null, null, 2));
  
    // Normalize
    ops.divseq(dataProcessedTensor, 255);
    
    // Convert to Tensor form
    const tensor = new ort.Tensor('float32', dataProcessedTensor.data, [1, 3, height, width]);
    
    if(tensor){
      console.log("tensor is set")
      setInputData(tensor);
      setIsDataReady(true)
    }
   
    else{
      console.log("tensor is NULL")
    }
  }

  const handleImageSelectClick = () => {
    imageInputRef.current?.click();
    setProgress(0)
  }
  const removeImage = () => {
    setImageSrc(null);
    canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsDataReady(false)
    setProgress(0)
  };

  return (
        <div className="app">
          <Card className='container' ref={containerRef}>
        
        <div className='state-text'>
        {isDataReady ?  (
          <>
        <ObjectDetection inputData={inputData} canvas ={canvasRef} setProgress= {setProgress}/>
        <Progress value={progress}></Progress>
        </>
        ):
         <p>Upload an image or open the camera to start detection.</p>
        
      }
        </div>
        
            <Card className="camera-card">
          
          
            <canvas className="canvas" ref={canvasRef} width="640" height="640" style={{ display: 'visible' }} />
           
              {imageSrc ? (
                <div>
                  <img className='image' src={imageSrc} alt="Uploaded"/>
                  <Button className='button-remove' onClick={removeImage}>Remove Image</Button>
                </div>
              ) : (
                <div>
                  <video className='video' ref={videoRef} autoPlay style={{ width: '100%' }}></video>
                </div>
              )}
            </Card>
            <div className="button-group">
              <Button onClick={handleImageSelectClick}>Select Image</Button>
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <Button onClick={toggleCamera}>{isCameraOn ? 'Close Camera' : 'Start Camera'}</Button>
            </div>
          </Card>
        </div>
      );

}

