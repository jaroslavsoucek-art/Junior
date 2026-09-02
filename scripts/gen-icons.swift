// Generates all PWA icons from scripts/logo-src.png (club crest, transparent background).
// Run: swift scripts/gen-icons.swift   (needs Xcode command line tools, no npm deps)
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let srcPath = "scripts/logo-src.png"
let outDir = "public"

func load(_ path: String) -> CGImage {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let s = CGImageSourceCreateWithURL(url, nil), let img = CGImageSourceCreateImageAtIndex(s, 0, nil) else {
        fatalError("cannot read \(path)")
    }
    return img
}

/// Bounding box of non-transparent pixels, so the crest fills the icon regardless of source margins.
func contentBox(_ img: CGImage) -> CGRect {
    let w = img.width, h = img.height
    var data = [UInt8](repeating: 0, count: w * h * 4)
    let cs = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    var minX = w, minY = h, maxX = 0, maxY = 0
    for y in 0..<h {
        for x in 0..<w where data[(y * w + x) * 4 + 3] > 16 {
            if x < minX { minX = x }
            if x > maxX { maxX = x }
            if y < minY { minY = y }
            if y > maxY { maxY = y }
        }
    }
    return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

/// Square canvas `size`, filled with `bg` (nil = transparent), crest scaled to `fill` of the canvas, centred.
func render(_ img: CGImage, box: CGRect, size: Int, fill: CGFloat, bg: CGColor?) -> CGImage {
    let cs = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = .high
    if let bg = bg {
        ctx.setFillColor(bg)
        ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
    }
    let cropped = img.cropping(to: box)!
    let side = CGFloat(size) * fill
    let scale = side / max(box.width, box.height)
    let dw = box.width * scale, dh = box.height * scale
    ctx.draw(cropped, in: CGRect(x: (CGFloat(size) - dw) / 2, y: (CGFloat(size) - dh) / 2, width: dw, height: dh))
    return ctx.makeImage()!
}

func save(_ img: CGImage, _ path: String) {
    let url = URL(fileURLWithPath: path) as CFURL
    let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil)
    guard CGImageDestinationFinalize(dest) else { fatalError("cannot write \(path)") }
    print("wrote \(path)")
}

let src = load(srcPath)
let box = contentBox(src)
let white = CGColor(red: 1, green: 1, blue: 1, alpha: 1)
try? FileManager.default.createDirectory(atPath: "\(outDir)/icons", withIntermediateDirectories: true)

// Home-screen icons: opaque white, crest nearly edge to edge (iOS/Android round the corners themselves).
save(render(src, box: box, size: 180, fill: 0.94, bg: white), "\(outDir)/icons/apple-touch-icon.png")
save(render(src, box: box, size: 192, fill: 0.94, bg: white), "\(outDir)/icons/icon-192.png")
save(render(src, box: box, size: 512, fill: 0.94, bg: white), "\(outDir)/icons/icon-512.png")
// Maskable: Android masks up to 20 % from each edge – keep the crest inside the 80 % safe zone.
save(render(src, box: box, size: 512, fill: 0.72, bg: white), "\(outDir)/icons/icon-512-maskable.png")
// Browser tab favicon: transparent background is fine here.
save(render(src, box: box, size: 64, fill: 1.0, bg: nil), "\(outDir)/favicon.png")
save(render(src, box: box, size: 32, fill: 1.0, bg: nil), "\(outDir)/favicon-32.png")
// In-app logo (header), transparent.
try? FileManager.default.createDirectory(atPath: "src/assets", withIntermediateDirectories: true)
save(render(src, box: box, size: 256, fill: 1.0, bg: nil), "src/assets/logo.png")
