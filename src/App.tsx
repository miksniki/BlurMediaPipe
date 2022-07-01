import { useRef, useEffect } from 'react';
import './App.css'
import * as bodySegmentation from '@tensorflow-models/body-segmentation'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-core'
import '@mediapipe/selfie_segmentation'

const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;

const segmenterConfig: bodySegmentation.MediaPipeSelfieSegmentationTfjsModelConfig | bodySegmentation.BodyPixModelConfig | undefined = {
  runtime: 'tfjs',
  modelType: 'general'
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
    /* setTimeout(() => drawBlur(), 20) */
  }

  return (
    <div className="App">
      <video playsInline width={200} ref={videoPreviewRef} id="video" />
      <canvas ref={canvasJoinRef} id="canvas" />
      <button onClick={() => matchCanvasWithVideo()}>BLUR</button>
    </div>
  );
}

export default App;
