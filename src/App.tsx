import { useRef, useEffect } from 'react';
import './App.css'
import * as bodySegmentation from '@tensorflow-models/body-segmentation'
import * as mpSelfieSegmentation from '@mediapipe/selfie_segmentation';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-core'
import '@mediapipe/selfie_segmentation'

import swag from './background/swag.png'

const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;

const segmenterConfig: any = {
  runtime: 'mediapipe',
  modelType: 'general',
  solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${mpSelfieSegmentation.VERSION}`
}

const segmenter = bodySegmentation.createSegmenter(model, segmenterConfig);

const App = () => {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const canvasJoinRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      if (videoPreviewRef?.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.play().catch((previewPlayError) => console.error('Player preview error: ', previewPlayError))
      }
    })
  }, [])

  async function matchCanvasWithVideo() {
    if (videoPreviewRef?.current && canvasJoinRef?.current) {
      videoPreviewRef.current.width = canvasJoinRef.current.width = videoPreviewRef.current.videoWidth
      videoPreviewRef.current.height = canvasJoinRef.current.height = videoPreviewRef.current.videoHeight
      drawBlur()
    }
  }

  async function drawBlur() {
    if (segmenter && videoPreviewRef?.current) {
      const people = await (await segmenter).segmentPeople(videoPreviewRef?.current);
      if (canvasJoinRef?.current) {
        await bodySegmentation.drawBokehEffect(canvasJoinRef?.current, videoPreviewRef?.current, people, 0.5, 20, 3, false)
      }
    } 
    window.requestAnimationFrame(() => drawBlur())
  }

  function onVirtualResults(results: any) {
    const canvasCtx = canvasJoinRef?.current?.getContext('2d')
    if (canvasCtx && canvasJoinRef?.current) {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasJoinRef.current?.width, canvasJoinRef.current?.height);
      canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasJoinRef.current?.width, canvasJoinRef.current?.height);

      // Only overwrite existing pixels.
      canvasCtx.globalCompositeOperation = 'source-out';
      canvasCtx.fillStyle = 'f00';
      canvasCtx.fillRect(0, 0, canvasJoinRef.current?.width, canvasJoinRef.current?.height)

      // Only overwrite missing pixels.
      canvasCtx.globalCompositeOperation = 'destination-atop';
      canvasCtx.drawImage(results.image, 0, 0, canvasJoinRef.current?.width, canvasJoinRef.current?.height);
      canvasCtx.restore();
    }
  }

  function drawVirtualBackground() {
    const selfieSegmentation = new SelfieSegmentation({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
    selfieSegmentation.setOptions({
      modelSelection: 1,
    });
    selfieSegmentation.onResults(onVirtualResults);

    if (videoPreviewRef?.current && canvasJoinRef?.current) {
      videoPreviewRef.current.width = canvasJoinRef.current.width = videoPreviewRef.current.videoWidth
      videoPreviewRef.current.height = canvasJoinRef.current.height = videoPreviewRef.current.videoHeight
      const camera = new Camera(videoPreviewRef.current, {
        onFrame: async () => {
          if (videoPreviewRef?.current)
          await selfieSegmentation.send({ image: videoPreviewRef.current });
        },
        width: 1280,
        height: 720
      });
      camera.start().catch((err) => console.error('error'));
      return null
    }
  }

  return (
    <div className="App">
      <video playsInline width={200} ref={videoPreviewRef} id="video" />
      <canvas ref={canvasJoinRef} id="canvas" />
      <button onClick={() => matchCanvasWithVideo()}>BLUR</button>
      <button onClick={() => drawVirtualBackground()}>VIRTUAL</button>
    </div>
  );
}

export default App;
