import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { FaCamera, FaTimes, FaSun, FaMoon, FaDownload, FaSyncAlt } from 'react-icons/fa';

const WebcamCapture = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [darkMode, setDarkMode] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [facingMode, setFacingMode] = useState('user');

  useEffect(() => {
    document.title = "Object Detector"; // Set the title in the Chrome tab
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
      setIsLoading(false);
    };
    loadModel();
  }, []);

  const detectObjects = useCallback(async () => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4 && model) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      const predictions = await model.detect(video);
      setPredictions(predictions);

      const newDetections = predictions.map(prediction => ({
        className: prediction.class,
        score: prediction.score,
        timestamp: new Date().toLocaleTimeString(),
        screenshot: null // Will be updated later
      }));

      // Filter out duplicates and add new detections only
      newDetections.forEach(detection => {
        if (!detectionHistory.some(history => history.className === detection.className)) {
          captureScreenshotWithBoundingBoxes(detection);
        }
      });
    }
  }, [model, detectionHistory]);

  useEffect(() => {
    if (model) {
      const interval = setInterval(() => {
        detectObjects();
      }, 100);
      return () => clearInterval(interval);
    }
  }, [detectObjects, model]);

  const captureScreenshotWithBoundingBoxes = (detection) => {
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
    // Draw bounding boxes on the canvas
    predictions
      .filter(prediction => prediction.score >= confidenceThreshold)
      .forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = 'red';
        ctx.fillText(prediction.class, x, y > 10 ? y - 5 : y + 15);
      });
  
    // Capture the canvas as a screenshot
    const imageSrc = canvas.toDataURL('image/jpeg');
    detection.screenshot = imageSrc;
    setDetectionHistory(prevHistory => [detection, ...prevHistory]);
  };
  
  
  

  const captureScreenshot = () => {
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (showBoundingBoxes) {
      predictions
        .filter(prediction => prediction.score >= confidenceThreshold)
        .forEach(prediction => {
          const [x, y, width, height] = prediction.bbox;
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);
          ctx.fillStyle = 'red';
          ctx.fillText(prediction.class, x, y > 10 ? y - 5 : y + 15);
        });
    }

    const imageSrc = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = 'screenshot.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadScreenshot = (screenshot) => {
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = 'detection.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCamera = () => {
    setFacingMode((prevFacingMode) => (prevFacingMode === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {showPopup && (
        <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg relative text-center text-white">
            <button
              className="absolute top-2 right-2 text-gray-700 dark:text-gray-300"
              onClick={() => setShowPopup(false)}
            >
              <FaTimes size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-4">Welcome to Object Detector</h2>
            <p className="mb-4">This application uses machine learning to detect objects in real-time. Here are some of the features:</p>
            <ul className="list-disc list-inside mb-4 text-left">
              <li>Real-time object detection with bounding boxes.</li>
              <li>Detection history with timestamps and confidence scores.</li>
              <li>Screenshot functionality to save images.</li>
              <li>Toggle visibility of bounding boxes.</li>
              <li>Adjust confidence threshold for detections.</li>
              <li>Toggle between light and dark modes.</li>
              <li>Animated transitions and tooltips with additional information.</li>
              <li>Switch between different pre-trained models.</li>
            </ul>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setShowPopup(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      <header className="text-5xl font-extrabold mb-8">Object Detector</header>
      <div className="relative">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="rounded-lg shadow-lg mb-4"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: facingMode,
          }}
        />
        <canvas ref={canvasRef} className="hidden" />
        {showBoundingBoxes && (
          <div className="absolute top-0 left-0 w-full h-full">
            {predictions
              .filter(prediction => prediction.score >= confidenceThreshold)
              .map((prediction, index) => {
                const [x, y, width, height] = prediction.bbox;
                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      border: '2px solid red',
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      transition: 'all 0.2s ease-in-out',
                    }}
                    title={`Confidence: ${(prediction.score * 100).toFixed(2)}%`}
                  >
                    <p className="bg-red-500 text-white text-xs px-1">{prediction.class}</p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {isLoading && <p className="text-xl mt-4">Loading model...</p>}
      <div className="flex space-x-4 mt-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={captureScreenshot}
        >
          <FaCamera className="inline mr-2" /> Capture Screenshot
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
        >
          Toggle Bounding Boxes
        </button>
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <FaSun className="inline mr-2" /> : <FaMoon className="inline mr-2" />} Toggle Mode
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded"
          onClick={toggleCamera}
        >
          <FaSyncAlt className="inline mr-2" /> Toggle Camera
        </button>
      </div>
      <div className="mt-4 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-2">Confidence Threshold: {confidenceThreshold.toFixed(2)}</h2>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="mt-4 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-2">Detection History</h2>
        <ul className="space-y-2">
          {detectionHistory.map((detection, index) => (
            <li key={index} className="p-2 bg-white dark:bg-gray-700 rounded shadow">
              <p className="text-sm"><strong>{detection.className}</strong> - {Math.round(detection.score * 100)}% - {detection.timestamp}</p>
              <img src={detection.screenshot} alt={`${detection.className} detected`} className="mt-2 w-full" />
              <button
                className="mt-2 flex items-center text-blue-500"
                onClick={() => downloadScreenshot(detection.screenshot)}
              >
                <FaDownload className="mr-2" /> Download Screenshot
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WebcamCapture;
