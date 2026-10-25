// Encodes a timed sequence of JPEG frames into an H.264 MP4 with Apple's built-in encoder (AVFoundation), so the Handovo films
// need no ffmpeg. Used by tools/handovo/films.mjs.
//   swiftc -O tools/handovo/frames2mp4.swift -o /tmp/frames2mp4
//   /tmp/frames2mp4 <list.tsv> <out.mp4> <from s> <to s> <out width> <out height> [crop x y w h]
// list.tsv: one frame per line, "<jpeg path>\t<start time in seconds>" in time order. Output is 25 fps; each output frame shows the
// last input frame that started at or before its time. Crop is in source pixels; out width/height 0 = the crop (or source) size.
import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

let a = CommandLine.arguments
guard a.count >= 7 else { print("usage: frames2mp4 list.tsv out.mp4 from to width height [x y w h]"); exit(1) }
let rows = try String(contentsOfFile: a[1], encoding: .utf8).split(separator: "\n").map { $0.split(separator: "\t") }
let frames: [(String, Double)] = rows.compactMap { $0.count == 2 ? (String($0[0]), Double($0[1])!) : nil }
let from = Double(a[3])!, to = Double(a[4])!
func load(_ p: String) -> CGImage { let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: p) as CFURL, nil)!; return CGImageSourceCreateImageAtIndex(src, 0, nil)! }
let first = load(frames[0].0)
let crop = a.count >= 11 ? CGRect(x: Double(a[7])!, y: Double(a[8])!, width: Double(a[9])!, height: Double(a[10])!)
                         : CGRect(x: 0, y: 0, width: first.width, height: first.height)
var W = Int(a[5])!, H = Int(a[6])!
if W == 0 { W = Int(crop.width); H = Int(crop.height) }
W -= W % 2; H -= H % 2

let out = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: out)
let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true   // index at the front, so the browser can start playing at once
let bitrate = Int(Double(W * H) * 25 * 0.024)   // about 780 kbit/s at 1440 x 900: sharp text during scrolls and fades (0.011 looked soft)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                    AVVideoMaxKeyFrameIntervalKey: 50, AVVideoAllowFrameReorderingKey: true]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)

var k = 0, lastPath = "", img = first
let n = Int(((to - from) * 25).rounded())
for f in 0..<n {
  let t = from + Double(f) / 25
  while k + 1 < frames.count && frames[k + 1].1 <= t { k += 1 }
  if frames[k].0 != lastPath { lastPath = frames[k].0; img = load(lastPath).cropping(to: crop) ?? load(lastPath) }
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
  var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!),
                      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  ctx.interpolationQuality = .high; ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: 25))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0); writer.finishWriting { done.signal() }; done.wait()
if writer.status != .completed { print("failed:", writer.error?.localizedDescription ?? "?"); exit(1) }
