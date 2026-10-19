// cut <in> <out.png> <maxPx> — subject cut-out with alpha, cropped to the subject (Apple Vision, on device)
import Vision; import CoreImage; import ImageIO
let a=CommandLine.arguments
let src=CGImageSourceCreateWithURL(URL(fileURLWithPath:a[1]) as CFURL,nil)!
let o:[CFString:Any]=[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceCreateThumbnailWithTransform:true,kCGImageSourceThumbnailMaxPixelSize:Int(a[3])!]
let cg=CGImageSourceCreateThumbnailAtIndex(src,0,o as CFDictionary)!
let req=VNGenerateForegroundInstanceMaskRequest(); let h=VNImageRequestHandler(cgImage:cg)
try h.perform([req]); guard let r=req.results?.first else { print("no subject"); exit(1) }
let buf=try r.generateMaskedImage(ofInstances:r.allInstances,from:h,croppedToInstancesExtent:true)
let ci=CIImage(cvPixelBuffer:buf)
try CIContext().writePNGRepresentation(of:ci,to:URL(fileURLWithPath:a[2]),format:.RGBA8,colorSpace:CGColorSpace(name:CGColorSpace.sRGB)!)
print(a[2],ci.extent.size)
