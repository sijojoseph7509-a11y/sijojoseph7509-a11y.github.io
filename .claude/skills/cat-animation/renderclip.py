# Renders the exported cat (GLB) at a frame of its "sit" clip from several sides.  blender -b -P renderclip.py -- in.glb out_prefix [frame]
import bpy, sys, math, mathutils
args = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=args[0])
rig = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]; sc = bpy.context.scene
act = bpy.data.actions[0]; rig.animation_data.action = act
f = int(args[2]) if len(args) > 2 else int(act.frame_range[1]); sc.frame_set(f)
sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 900; sc.render.resolution_y = 900; sc.display.shading.show_cavity = True
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = 46
# importer: glTF Y-up → Blender Z-up, head toward −Y
tgt = mathutils.Vector((0, -10, 17))
for name, d, sc_ in [("side", (1, 0, 0.05), 46), ("front", (0, -1, 0.08), 46), ("q", (0.7, -0.65, 0.3), 46), ("back", (-0.55, 0.8, 0.3), 46), ("neck", (0.25, -1, 0.15), 18)]:
    d = mathutils.Vector(d).normalized(); t = tgt if name != "neck" else mathutils.Vector((0, -18, 27))
    cam.location = t + d * 150; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler(); cam.data.ortho_scale = sc_
    sc.render.filepath = f"{args[1]}_{name}.png"; bpy.ops.render.render(write_still=True)
