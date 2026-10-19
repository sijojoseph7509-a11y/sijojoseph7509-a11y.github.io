// frames <video> <out-prefix> [n=4] — n evenly spaced stills as JPEG (for posters and checks)
import AVFoundation; import AppKit
let a=CommandLine.arguments; let as_=AVURLAsset(url:URL(fileURLWithPath:a[1])); let g=AVAssetImageGenerator(asset:as_); g.appliesPreferredTrackTransform=true
let n=a.count>3 ? Int(a[3])! : 4; let d=CMTimeGetSeconds(as_.duration)
for i in 0..<n { if let c=try? g.copyCGImage(at:CMTime(seconds:d*Double(i)/Double(n)+0.3,preferredTimescale:600),actualTime:nil){ try! NSBitmapImageRep(cgImage:c).representation(using:.jpeg,properties:[:])!.write(to:URL(fileURLWithPath:"\(a[2])_\(i).jpg")) } }
