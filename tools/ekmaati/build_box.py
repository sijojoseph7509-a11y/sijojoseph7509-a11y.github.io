# Blender (background) script: builds the Ekmaati temple box as a GLB with real board thickness.
#   blender -b --factory-startup -P tools/ekmaati/build_box.py -- work/ekmaati/fx/box.glb [preview.png]
# Units: the sleeve is 1.0 wide (the real box is ~11 cm), measured from the photographs.
# Geometry and UVs only: textures are applied in ekmaati-fx.js by material name (keeps the GLB tiny, WebP stays WebP).
# Blender -Y is the front; glTF export turns it into +Z.
import bpy, bmesh, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]; PREVIEW = argv[1] if len(argv) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
T = 0.006                      # board thickness
W, H = 1.0, 1.49               # sleeve
PL = 0.17                      # plinth height
BODY = H - PL                  # temple body
TW = W - 2 * T - 0.004         # temple sits just inside the sleeve
# window in the temple face texture (t_face.webp, 768 x 1180): x 92..686, y 76..1096 from the top, corner radius 70
WX0, WX1 = 92 / 768, 686 / 768
WY0, WY1 = 1 - 1096 / 1180, 1 - 76 / 1180
WR = 70 / 768

mats = {}
def mat(name):
    if name not in mats:
        m = bpy.data.materials.new(name); m.use_nodes = True; mats[name] = m
    return mats[name]

def obj(name, bm, mat_names):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for n in mat_names: me.materials.append(mat(n))
    return o

def quad(bm, uvl, pts, uvs, mi):
    vs = [bm.verts.new(p) for p in pts]
    f = bm.faces.new(vs); f.material_index = mi
    for l, uv in zip(f.loops, uvs): l[uvl].uv = uv
    return f

def slab(name, w, h, t, front, back, edge, origin_top=False):
    """A thin board w x h x t facing -Y. front/back/edge are material names; front gets the full texture."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    z0, z1 = (-h, 0) if origin_top else (-h / 2, h / 2)
    x0, x1, y0, y1 = -w / 2, w / 2, -t / 2, t / 2
    F, B, E = 0, 1, 2
    quad(bm, uvl, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], [(0, 0), (1, 0), (1, 1), (0, 1)], F)
    quad(bm, uvl, [(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)], [(0, 0), (1, 0), (1, 1), (0, 1)], B)
    e = [(0, 0), (1, 0), (1, 1), (0, 1)]
    quad(bm, uvl, [(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)], e, E)
    quad(bm, uvl, [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], e, E)
    quad(bm, uvl, [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], e, E)
    quad(bm, uvl, [(x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0)], e, E)
    return obj(name, bm, [front, back, edge])

def rounded_rect(x0, y0, x1, y1, r, seg=10):
    pts = []
    for cx, cy, a0 in [(x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)]:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def frame(name, w, h, t):
    """Temple face: board w x h x t with the arched window cut through it, UVs from the face texture."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    outer = [(0, 0), (1, 0), (1, 1), (0, 1)]
    inner = rounded_rect(WX0, WY0, WX1, WY1, WR)
    # cap faces: bridge outer and inner rings as a strip of quads/tris by angle (window is convex)
    def ring_pts(u): return [(u[0] - .5) * w, (u[1]) * h - h / 2]
    cx, cy = (WX0 + WX1) / 2, (WY0 + WY1) / 2
    def outer_at(ang):   # point on the outer rect along a ray from the window centre
        dx, dy = math.cos(ang), math.sin(ang)
        ts = []
        if dx: ts += [((1 if dx > 0 else 0) - cx) / dx]
        if dy: ts += [((1 if dy > 0 else 0) - cy) / dy]
        tt = min(t_ for t_ in ts if t_ > 0); return (cx + dx * tt, cy + dy * tt)
    N = len(inner)
    outs = [outer_at(math.atan2(p[1] - cy, p[0] - cx)) for p in inner]
    for side, y in ((0, -t / 2), (1, t / 2)):
        for i in range(N):
            j = (i + 1) % N
            a, b, c, d = inner[i], inner[j], outs[j], outs[i]
            ring = [a, b, c, d]
            # the outer corners: add the rect corner between two rays when they fall on different edges
            corner = None
            for k in outer:
                ai = math.atan2(outs[i][1] - cy, outs[i][0] - cx); aj = math.atan2(outs[j][1] - cy, outs[j][0] - cx); ak = math.atan2(k[1] - cy, k[0] - cx)
                if aj < ai: aj += 2 * math.pi
                if ak < ai: ak += 2 * math.pi
                if ai < ak < aj: corner = k
            if corner: ring = [a, b, c, corner, d]
            if side == 1: ring = ring[::-1]
            vs = [bm.verts.new((ring_pts(u)[0], y, ring_pts(u)[1])) for u in ring]
            f = bm.faces.new(vs); f.material_index = 0
            for l, u in zip(f.loops, ring): l[uvl].uv = u
    # inner window walls (the cut edge of the board)
    for i in range(N):
        j = (i + 1) % N
        p, q = ring_pts(inner[i]), ring_pts(inner[j])
        vs = [bm.verts.new((p[0], -t / 2, p[1])), bm.verts.new((p[0], t / 2, p[1])), bm.verts.new((q[0], t / 2, q[1])), bm.verts.new((q[0], -t / 2, q[1]))]
        f = bm.faces.new(vs); f.material_index = 1
        for l in f.loops: l[uvl].uv = (0.5, 0.5)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, ["m_face", "m_edge"])

def boxmesh(name, w, d, h, side, top):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    x0, x1, y0, y1, z0, z1 = -w / 2, w / 2, -d / 2, d / 2, -h / 2, h / 2
    u = [(0, 0), (1, 0), (1, 1), (0, 1)]
    quad(bm, uvl, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], u, 0)
    quad(bm, uvl, [(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)], u, 0)
    quad(bm, uvl, [(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)], u, 0)
    quad(bm, uvl, [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], u, 0)
    quad(bm, uvl, [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], u, 1)
    quad(bm, uvl, [(x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0)], u, 1)
    return obj(name, bm, [side, top])

def place(o, loc, rz=0):
    o.location = loc; o.rotation_euler = (0, 0, rz); return o

# ---- temple ----
place(boxmesh("plinth", TW, TW, PL, "m_plinth", "m_paper"), (0, 0, PL / 2))
zc = PL + BODY / 2
hf = TW / 2 - T / 2
place(frame("temple_front", TW, BODY, T), (0, -hf, zc))
place(frame("temple_right", TW, BODY, T), (hf, 0, zc), math.pi / 2)
place(frame("temple_left", TW, BODY, T), (-hf, 0, zc), -math.pi / 2)
place(slab("temple_back", TW, BODY, T, "m_sun", "m_paper", "m_edge"), (0, hf, zc))
place(boxmesh("temple_top", TW, TW, T, "m_edge", "m_paper"), (0, 0, H - T / 2))
RW, RH = 0.52, 0.10
place(boxmesh("roof", RW, RW, RH, "m_roof", "m_paper"), (0, 0, H + RH / 2))
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.17, radius2=0.0, depth=0.13)
pk = obj("peak", bm, ["m_paper"]); place(pk, (0, 0, H + RH + 0.065), math.pi / 4)
# idol card (turned toward the viewer in the page)
IH = 0.62 * 909 / 570
idol = slab("idol", 0.62, IH, 0.0005, "m_idol", "m_idol", "m_idol"); place(idol, (0, 0.02, PL + 0.03 + IH / 2))

# ---- sleeve: origin of each tab on its top edge (the hinge) ----
so = W / 2 - T / 2
for name, mname, loc, rz in [("tab_front", "m_s_front", (0, -so, H), 0), ("tab_right", "m_s_right", (so, 0, H), math.pi / 2),
                             ("tab_left", "m_s_left", (-so, 0, H), -math.pi / 2), ("sleeve_back", "m_s_back", (0, so, H), math.pi)]:
    place(slab(name, W, H, T, mname, "m_inside", "m_edge", origin_top=True), loc, rz)

for o in bpy.context.scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_materials="EXPORT", export_apply=True, export_yup=True)
print("wrote", OUT)

if PREVIEW:   # quick Workbench render to check proportions
    scn = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    cam.location = (2.6, -4.2, 2.1); cam.rotation_euler = (math.radians(72), 0, math.radians(32))
    scn.render.engine = "BLENDER_WORKBENCH"; scn.render.resolution_x = 600; scn.render.resolution_y = 700
    scn.display.shading.light = "STUDIO"; scn.display.shading.show_cavity = True
    for o in list(scn.objects):
        if o.name.startswith("tab_front") or o.name == "tab_left": o.hide_render = True
    scn.render.filepath = PREVIEW; bpy.ops.render.render(write_still=True)
