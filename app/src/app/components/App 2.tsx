import React, { useState, useRef } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function App() {

  return (
      <Button>Button</Button>
  );
  // const [imageSrc, setImageSrc] = useState(null);
  // const videoRef = useRef<HTMLVideoElement>(null);
  // const imageInputRef = useRef<HTMLInputElement>(null);

  // const startCamera = () => {
  //   if (navigator.mediaDevices.getUserMedia) {
  //     navigator.mediaDevices.getUserMedia({ video: true })
  //       .then(stream => {
  //         if (videoRef.current) {
  //           videoRef.current.srcObject = stream;
  //         }
  //       })
  //       .catch(err => {
  //         console.log("Something went wrong!", err);
  //       });
  //   }
  // };

  // const uploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files && event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     //reader.onload = e => setImageSrc(e.target?.result as string);
  //     // reader.readAsDataURL(file);
  //   }
  // };

  // const handleImageSelectClick = () => {
  //   if (imageInputRef.current) {
  //     imageInputRef.current.click();
  //   }
  // };

  // return (
  //   <div className="app">
  //     <Card className="camera-card">
  //       {imageSrc ? (
  //         <img src={imageSrc} alt="Uploaded" />
  //       ) : (
  //         <video ref={videoRef} autoPlay />
  //       )}
  //     </Card>
  //     <div className="button-group">
  //       <Button onClick={handleImageSelectClick}>Select Image</Button>
  //       <input
  //         type="file"
  //         ref={imageInputRef}
  //         onChange={uploadImage}
  //         style={{ display: 'none' }}
  //       />
  //       <Button onClick={startCamera}>Start Camera</Button>
  //     </div>
  //   </div>
  // );
}
