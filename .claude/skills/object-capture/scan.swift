import Foundation
import RealityKit
let a = CommandLine.arguments
let input = URL(fileURLWithPath: a[1], isDirectory: true), output = URL(fileURLWithPath: a[2])
var cfg = PhotogrammetrySession.Configuration()
cfg.sampleOrdering = .unordered
cfg.featureSensitivity = .high
cfg.isObjectMaskingEnabled = true
print("supported:", PhotogrammetrySession.isSupported)
let session = try PhotogrammetrySession(input: input, configuration: cfg)
let sem = DispatchSemaphore(value: 0)
Task {
  for try await o in session.outputs {
    switch o {
    case .requestProgress(_, let f): print(String(format: "progress %.0f%%", f * 100))
    case .requestComplete(_, let r): print("complete", r)
    case .requestError(_, let e): print("ERROR", e)
    case .processingComplete: print("done"); sem.signal()
    case .invalidSample(let id, let reason): print("invalid sample", id, reason)
    case .skippedSample(let id): print("skipped sample", id)
    case .automaticDownsampling: print("downsampling")
    default: break
    }
  }
}
try session.process(requests: [.modelFile(url: output, detail: .reduced)])
sem.wait()
