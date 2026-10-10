import bpy, sys, mathutils
out = sys.argv[-1]
sys.path.insert(0, __import__('os').path.dirname(__file__)); from common import load_cat
ob = load_cat(sys.argv[-2])
vs = [v.co for v in ob.data.vertices]; mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 1600; sc.render.resolution_y = 1000
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "SINGLE"; sc.display.shading.show_xray = True; sc.display.shading.xray_alpha = 0.6
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
c = mathutils.Vector([(a + b) / 2 for a, b in zip(mn, mx)])
for name, loc, rot, ortho in [("side", (c.x + 200, c.y, c.z), (1.5708, 0, 1.5708), 1.15 * max(mx[1] - mn[1], (mx[2] - mn[2]) * 1.6)),
                              ("top", (c.x, c.y, c.z + 200), (0, 0, 1.5708), 1.15 * max(mx[1] - mn[1], (mx[0] - mn[0]) * 1.6)),
                              ("front", (c.x, mn[1] - 200, c.z), (1.5708, 0, 0), 1.3 * (mx[2] - mn[2]) * 1.6)]:
    cam.location = loc; cam.rotation_euler = rot; cam.data.ortho_scale = ortho
    sc.render.filepath = f"{out}_{name}.png"; bpy.ops.render.render(write_still=True)
    print("VIEW", name, "center", tuple(round(x, 2) for x in c), "ortho", round(ortho, 2))
