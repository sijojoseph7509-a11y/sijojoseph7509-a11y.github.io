# Builds a quadruped skeleton for the site's cat mesh, skins it (Blender bone-heat weights), and exports a GLB.
#   blender -b -P rig.py -- <cat.glb> <out.glb> [posetest.png]
import bpy, sys, os, math, mathutils
sys.path.insert(0, os.path.dirname(__file__)); from common import load_cat
args = sys.argv[sys.argv.index("--") + 1:]
ob = load_cat(args[0])
V = mathutils.Vector
# joint positions (cm; x lateral, y forward = -Y is the head, z up) read off orthographic views of the mesh
J = {
  "pelvis": (0, 6.5, 21.5), "spine1": (0, 0, 22.5), "spine2": (0, -7, 23), "chest": (0, -13.5, 22.5), "neck": (0, -18.5, 23.5),
  "head": (0, -22, 28.5), "nose": (0, -30.5, 30),
  "tail": [(0, 8.3, 23.8), (0, 11.8, 23.5), (0, 15.4, 22.7), (0, 19.0, 22.0), (0, 22.6, 21.4), (0, 26.2, 21.0), (0, 30.4, 20.7)],
  "fl": [(4.0, -15.0, 25.0), (4.0, -18.4, 17.5), (4.0, -16.9, 12.0), (4.0, -16.9, 5.4), (4.0, -19.4, 1.6), (4.0, -21.0, 1.2)],   # scapula top, shoulder, elbow, wrist, paw ball, toe tip
  "hl": [(4.0, 5.6, 21.0), (4.0, 2.8, 13.8), (4.0, 8.4, 7.3), (4.0, 5.4, 2.2), (4.0, 3.0, 1.3)],                            # hip, knee, hock, paw ball, toe tip
}
arm = bpy.data.armatures.new("CatRig"); rig = bpy.data.objects.new("CatRig", arm); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="EDIT")
eb = arm.edit_bones
def bone(name, a, b, parent=None, connect=False):
    e = eb.new(name); e.head = V(a); e.tail = V(b); e.roll = 0
    if parent: e.parent = eb[parent]; e.use_connect = connect
    return e
bone("root", (0, 0, 0), (0, 0, 6))
bone("hips", J["pelvis"], J["spine1"], "root")                     # pelvis/lumbar: the body's root in motion
bone("spine", J["spine1"], J["spine2"], "hips", True)
bone("chest", J["spine2"], J["chest"], "spine", True)
bone("neck", J["chest"], J["neck"], "chest", True)
bone("neck2", J["neck"], J["head"], "neck", True)
bone("head", J["head"], J["nose"], "neck2", True)
prev = "hips"; t = J["tail"]
bone("pelvisBack", J["pelvis"], t[0], "hips")                     # rump, carries the tail and hind legs
prev = "pelvisBack"
for i in range(len(t) - 1):
    bone(f"tail{i}", t[i], t[i + 1], prev, i > 0); prev = f"tail{i}"
for side, sx in (("L", 1), ("R", -1)):
    f = [(p[0] * sx, p[1], p[2]) for p in J["fl"]]
    bone(f"scapula{side}", f[0], f[1], "chest")
    bone(f"humerus{side}", f[1], f[2], f"scapula{side}", True)
    bone(f"forearm{side}", f[2], f[3], f"humerus{side}", True)
    bone(f"hand{side}", f[3], f[4], f"forearm{side}", True)
    bone(f"fingers{side}", f[4], f[5], f"hand{side}", True)
    h = [(p[0] * sx, p[1], p[2]) for p in J["hl"]]
    bone(f"thigh{side}", h[0], h[1], "pelvisBack")
    bone(f"shin{side}", h[1], h[2], f"thigh{side}", True)
    bone(f"foot{side}", h[2], h[3], f"shin{side}", True)
    bone(f"toes{side}", h[3], h[4], f"foot{side}", True)
for e in eb: e.roll = 0
bpy.ops.object.mode_set(mode="OBJECT")
arm.bones["root"].use_deform = False
# skin: bone heat; fall back to envelopes if it can't solve (separate leg shells)
ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
empty = [v for v in ob.data.vertices if not v.groups or sum(g.weight for g in v.groups) < 1e-4]
print("UNWEIGHTED", len(empty), "of", len(ob.data.vertices))
# loose parts inside the head (eyeballs, teeth, inner mouth) and the skull itself move rigidly with the head bone,
# otherwise bone heat splits them between neck and head and they slide out of their sockets when she looks down
import bmesh
bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
seen, islands = set(), []
for v in bm.verts:
    if v.index in seen: continue
    stack, isl = [v], []
    seen.add(v.index)
    while stack:
        x = stack.pop(); isl.append(x.index)
        for e in x.link_edges:
            o = e.other_vert(x)
            if o.index not in seen: seen.add(o.index); stack.append(o)
    islands.append(isl)
co = [v.co.copy() for v in ob.data.vertices]
headg = ob.vertex_groups["head"]
def rigid_head(idx):
    for g in ob.vertex_groups: g.remove(idx)
    headg.add(idx, 1.0, "REPLACE")
big = max(islands, key=len); n = 0
# skull (in front of the ear bases) and the ears are rigid to the head
for i in big:
    if co[i].y < -23 or (co[i].y < -15 and co[i].z > 31): rigid_head([i]); n += 1
# every loose part (eyes, inner ears, chest bib…) copies the weights of the nearest skin vertex, so it moves with it
from mathutils import kdtree
kd = kdtree.KDTree(len(big))
for i in big: kd.insert(co[i], i)
kd.balance()
wts = {i: [(g.group, g.weight) for g in ob.data.vertices[i].groups] for i in big}
for isl in islands:
    if isl is big: continue
    for i in isl:
        _, j, _ = kd.find(co[i])
        for g in ob.vertex_groups: g.remove([i])
        for gi, w in wts[j]: ob.vertex_groups[gi].add([i], w, "REPLACE")
        n += 1
print("HEAD-RIGID", n, "islands", len(islands))
if len(args) > 2:   # pose test: walk-ish pose, render side view
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE"); pb = rig.pose.bones
    for n, ang in [("neck", 25), ("neck2", 15), ("head", 20), ("humerusL", -35), ("forearmL", 40), ("thighR", -30), ("shinR", 35), ("humerusR", 25), ("thighL", 20), ("tail0", 25), ("tail2", -20), ("spine", 8)]:
        pb[n].rotation_mode = "XYZ"; pb[n].rotation_euler = (math.radians(ang), 0, 0)
    bpy.ops.object.mode_set(mode="OBJECT")
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 1600; sc.render.resolution_y = 1000
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = "ORTHO"
    cam.location = (200, 0, 18.8); cam.rotation_euler = (1.5708, 0, 1.5708); cam.data.ortho_scale = 70
    sc.render.filepath = args[2]; bpy.ops.render.render(write_still=True)
    cam.location = (120, -90, 45); cam.rotation_euler = (math.radians(70), 0, math.radians(52)); cam.data.type = "PERSP"
    sc.render.filepath = args[2].replace(".png", "_3q.png"); bpy.ops.render.render(write_still=True)
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE"); bpy.ops.pose.select_all(action="SELECT"); bpy.ops.pose.transforms_clear(); bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=args[1], export_format="GLB", use_selection=True, export_skins=True, export_animations=False, export_materials="PLACEHOLDER", export_texcoords=True, export_yup=True)
print("EXPORTED", args[1])
