// vcut <in.mov> <out.mp4> <width> [aspect=0.8] [x y w h]
// Every frame's subject on flat paper colour #F2EFE6 (the case study's page colour), H.264, SDR.
// Pass 1 finds where the subject goes over the whole clip and crops to it (from the full-resolution source, so it
// stays sharp); pass 2 masks every frame with Apple Vision and smooths the mask over time so edges don't flicker.
import AVFoundation; import Vision; import CoreImage

let a = CommandLine.arguments
let url = URL(fileURLWithPath: a[1]); let outW = Int(a[3])!; let aspect = a.count > 4 ? Double(a[4])! : 0.8
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CIContext(options: [.workingColorSpace: srgb, .cacheIntermediates: false])

func frames(_ body: (CIImage, CMTime) -> Void) {
  let asset = AVURLAsset(url: url); let track = asset.tracks(withMediaType: .video)[0]; let tf = track.preferredTransform
  let r = try! AVAssetReader(asset: asset)
  let o = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]); r.add(o); r.startReading()
  while true { let more: Bool = autoreleasepool {   // free each frame's buffers right away (memory stays flat)
    guard let sb = o.copyNextSampleBuffer() else { return false }
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { return true }
    var img = CIImage(cvPixelBuffer: pb, options: [.toneMapHDRtoSDR: true]).transformed(by: tf).oriented(.down)
    img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
    body(img, CMSampleBufferGetPresentationTimeStamp(sb))
    return true } ; if !more { break } }
}
func mask(_ img: CIImage) -> CIImage? {
  let req = VNGenerateForegroundInstanceMaskRequest(); let h = VNImageRequestHandler(ciImage: img)
  guard (try? h.perform([req])) != nil, let r = req.results?.first, let mb = try? r.generateScaledMaskForImage(forInstances: r.allInstances, from: h) else { return nil }
  let m = CIImage(cvPixelBuffer: mb)
  return m.transformed(by: CGAffineTransform(scaleX: img.extent.width / m.extent.width, y: img.extent.height / m.extent.height))
}

// pass 1: union of the subject's bounds (every 8th frame, small)
var srcSize = CGSize.zero; var box = CGRect.null; var i = 0
frames { img, _ in
  srcSize = img.extent.size; defer { i += 1 }
  guard i % 8 == 0 else { return }
  let s = 360 / img.extent.width; let small = img.transformed(by: CGAffineTransform(scaleX: s, y: s))
  guard let m = mask(small) else { return }
  // bounds of mask > 0.5 via CIAreaMinMax would be coarse; sample a 90-px grid instead
  let w = 90, h = Int(Double(w) * small.extent.height / small.extent.width)
  var buf = [UInt8](repeating: 0, count: w * h)
  let mm = m.transformed(by: CGAffineTransform(scaleX: Double(w) / m.extent.width, y: Double(h) / m.extent.height))
  ctx.render(mm, toBitmap: &buf, rowBytes: w, bounds: CGRect(x: 0, y: 0, width: w, height: h), format: .L8, colorSpace: nil)
  for y in 0..<h { for x in 0..<w where buf[y * w + x] > 128 {
    let rr = CGRect(x: Double(x) / Double(w), y: Double(y) / Double(h), width: 1 / Double(w), height: 1 / Double(h)); box = box.union(rr) } }
}
if box.isNull { box = CGRect(x: 0, y: 0, width: 1, height: 1) }
// to source pixels, pad 7 %, then grow to the output aspect and keep it inside the frame
var c = CGRect(x: box.minX * srcSize.width, y: box.minY * srcSize.height, width: box.width * srcSize.width, height: box.height * srcSize.height)
c = c.insetBy(dx: -c.width * 0.07, dy: -c.height * 0.07)
if c.width / c.height < aspect { let nw = c.height * aspect; c = c.insetBy(dx: -(nw - c.width) / 2, dy: 0) } else { let nh = c.width / aspect; c = c.insetBy(dx: 0, dy: -(nh - c.height) / 2) }
if c.width > srcSize.width { let k = srcSize.width / c.width; c = CGRect(x: c.midX - c.width * k / 2, y: c.midY - c.height * k / 2, width: c.width * k, height: c.height * k) }
if c.height > srcSize.height { let k = srcSize.height / c.height; c = CGRect(x: c.midX - c.width * k / 2, y: c.midY - c.height * k / 2, width: c.width * k, height: c.height * k) }
c.origin.x = min(max(0, c.minX), srcSize.width - c.width); c.origin.y = min(max(0, c.minY), srcSize.height - c.height)
if a.count > 8 { c = CGRect(x: Double(a[5])!, y: Double(a[6])!, width: Double(a[7])!, height: Double(a[8])!) }   // manual crop (CI pixels, origin bottom-left)
let outH = Int(Double(outW) / aspect) / 2 * 2
print("crop", c, "→", outW, outH)

// pass 2
try? FileManager.default.removeItem(atPath: a[2])
let w = try! AVAssetWriter(outputURL: URL(fileURLWithPath: a[2]), fileType: .mp4); w.shouldOptimizeForNetworkUse = true
let wi = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: outW, AVVideoHeightKey: outH,
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_400_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
wi.expectsMediaDataInRealTime = false
let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: wi, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: outW, kCVPixelBufferHeightKey as String: outH])
w.add(wi); w.startWriting(); w.startSession(atSourceTime: .zero)
let full = CGRect(x: 0, y: 0, width: outW, height: outH)
let paper = CIImage(color: CIColor(red: 242/255, green: 239/255, blue: 230/255, alpha: 1, colorSpace: srgb)!).cropped(to: full)
var prev: CIImage? = nil; var n = 0
frames { img, t in
  let s = Double(outW) / c.width
  let f = img.cropped(to: c).transformed(by: CGAffineTransform(translationX: -c.minX, y: -c.minY)).transformed(by: CGAffineTransform(scaleX: s, y: s)).cropped(to: full)
  var m = mask(f)?.cropped(to: full) ?? prev ?? CIImage(color: .white).cropped(to: full)
  if let p = prev {   // temporal smoothing: 60 % this frame, 40 % the last
    m = m.applyingFilter("CIDissolveTransition", parameters: [kCIInputTargetImageKey: p, kCIInputTimeKey: 0.4]).cropped(to: full)
  }
  // render the smoothed mask so the chain doesn't grow frame after frame
  var mb: CVPixelBuffer?; CVPixelBufferCreate(nil, outW, outH, kCVPixelFormatType_32BGRA, nil, &mb)
  ctx.render(m, to: mb!, bounds: full, colorSpace: srgb); prev = CIImage(cvPixelBuffer: mb!)
  let soft = prev!.applyingGaussianBlur(sigma: 1.0).cropped(to: full)
  let comp = f.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: paper, kCIInputMaskImageKey: soft])
  while !wi.isReadyForMoreMediaData { usleep(2000) }
  var ob: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &ob)
  ctx.render(comp.cropped(to: full), to: ob!, bounds: full, colorSpace: srgb); ad.append(ob!, withPresentationTime: t); n += 1
}
wi.markAsFinished(); let sem = DispatchSemaphore(value: 0); w.finishWriting { sem.signal() }; sem.wait()
print(a[2], n, "frames", w.status.rawValue)
