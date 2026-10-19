// vcut <in.mov> <out.mp4> <width> — every frame's subject on flat cream #F4F0E8 (the case study's page colour), H.264
import AVFoundation; import Vision; import CoreImage
let a=CommandLine.arguments; let asset=AVURLAsset(url:URL(fileURLWithPath:a[1]))
let track=asset.tracks(withMediaType:.video)[0]; let tf=track.preferredTransform
let reader=try! AVAssetReader(asset:asset)
let out=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA]); reader.add(out)
let nat=track.naturalSize.applying(tf); let ow=Int(a[3])!; let oh=Int(Double(ow)*abs(nat.height)/abs(nat.width))/2*2
try? FileManager.default.removeItem(atPath:a[2])
let w=try! AVAssetWriter(outputURL:URL(fileURLWithPath:a[2]),fileType:.mp4)
let wi=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:ow,AVVideoHeightKey:oh,AVVideoColorPropertiesKey:[AVVideoColorPrimariesKey:AVVideoColorPrimaries_ITU_R_709_2,AVVideoTransferFunctionKey:AVVideoTransferFunction_ITU_R_709_2,AVVideoYCbCrMatrixKey:AVVideoYCbCrMatrix_ITU_R_709_2],AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:2_000_000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
wi.expectsMediaDataInRealTime=false
let ad=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:wi,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:ow,kCVPixelBufferHeightKey as String:oh])
w.add(wi); w.shouldOptimizeForNetworkUse=true; reader.startReading(); w.startWriting(); w.startSession(atSourceTime:.zero)
let ctx=CIContext(options:[.workingColorSpace:CGColorSpace(name:CGColorSpace.sRGB)!]); let full=CGRect(x:0,y:0,width:ow,height:oh)
let cream=CIImage(color:CIColor(red:244/255,green:240/255,blue:232/255,alpha:1,colorSpace:CGColorSpace(name:CGColorSpace.sRGB)!)!).cropped(to:full)
var lastMask:CIImage?=nil; var n=0
while let sb=out.copyNextSampleBuffer() {
  guard let pb=CMSampleBufferGetImageBuffer(sb) else { continue }
  let t=CMSampleBufferGetPresentationTimeStamp(sb)
  var img=CIImage(cvPixelBuffer:pb,options:[.toneMapHDRtoSDR:true]).transformed(by:tf).oriented(.down)
  img=img.transformed(by:CGAffineTransform(translationX:-img.extent.minX,y:-img.extent.minY))
  let s=Double(ow)/img.extent.width; img=img.transformed(by:CGAffineTransform(scaleX:s,y:s)).cropped(to:full)
  if n%2==0 {   // mask every other frame (the subject barely moves between two frames)
    let req=VNGenerateForegroundInstanceMaskRequest(); let h=VNImageRequestHandler(ciImage:img)
    if (try? h.perform([req])) != nil, let r=req.results?.first, let mb=try? r.generateScaledMaskForImage(forInstances:r.allInstances,from:h) {
      let m=CIImage(cvPixelBuffer:mb); lastMask=m.transformed(by:CGAffineTransform(scaleX:img.extent.width/m.extent.width,y:img.extent.height/m.extent.height)).applyingGaussianBlur(sigma:1.2).cropped(to:full)
    }
  }
  let comp = lastMask.map { img.applyingFilter("CIBlendWithMask",parameters:[kCIInputBackgroundImageKey:cream,kCIInputMaskImageKey:$0]) } ?? img
  while !wi.isReadyForMoreMediaData { usleep(2000) }
  var ob:CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil,ad.pixelBufferPool!,&ob)
  ctx.render(comp.cropped(to:full),to:ob!,bounds:full,colorSpace:CGColorSpace(name:CGColorSpace.sRGB)!); ad.append(ob!,withPresentationTime:t); n+=1
}
wi.markAsFinished(); let sem=DispatchSemaphore(value:0); w.finishWriting{sem.signal()}; sem.wait(); print(a[2],n,"frames",ow,oh,w.status.rawValue)
