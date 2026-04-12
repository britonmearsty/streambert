import os

path = r"c:\Users\mears\Desktop\others\streambert\src\styles\global.css"
with open(path, "rb") as f:
    content = f.read()

# Replace .sidebar-saved block
old_group = b'.sidebar-saved {\r\n    flex: 1;\r\n    overflow-y: auto;\r\n    overflow-x: hidden;\r\n    width: 100%;\r\n    display: flex;\r\n    flex-direction: column;\r\n    gap: 8px;\r\n    padding: 8px 12px;\r\n    min-height: 0;\r\n}'
new_group = b'.sidebar-saved {\n    flex: 1;\n    overflow-y: auto;\n    overflow-x: hidden;\n    width: 100%;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 8px;\n    min-height: 0;\n}'.replace(b'\n', b'\r\n')

# Replace .saved-thumb block
old_thumb = b'.saved-thumb {\r\n    width: 100%;\r\n    height: 60px;\r\n    border-radius: 5px;\r\n    overflow: visible;\r\n    cursor: pointer;\r\n    transition: all 0.2s;\r\n    flex-shrink: 0;\r\n    position: relative;\r\n    border: 1px solid var(--border);\r\n    display: flex;\r\n    align-items: center;\r\n    gap: 10px;\r\n    padding: 4px;\r\n    background: var(--surface2);\r\n}'
new_thumb = b'.saved-thumb {\n    width: 100%;\n    height: 42px;\n    border-radius: 6px;\n    overflow: visible;\n    cursor: pointer;\n    transition: all 0.2s;\n    flex-shrink: 0;\n    position: relative;\n    border: 1px solid transparent;\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    padding: 4px 8px;\n    background: transparent;\n}'.replace(b'\n', b'\r\n')

# Replace thumb image
old_thumb_img = b'.saved-thumb img {\r\n    border-radius: 4px;\r\n    overflow: hidden;\r\n    width: 40px;\r\n    height: 100%;\r\n    object-fit: cover;\r\n    flex-shrink: 0;\r\n}'
new_thumb_img = b'.saved-thumb img {\n    border-radius: 3px;\n    overflow: hidden;\n    width: 28px;\n    height: 100%;\n    object-fit: cover;\n    flex-shrink: 0;\n}'.replace(b'\n', b'\r\n')

# Replace title
old_title = b'.saved-thumb .saved-thumb-title {\r\n    font-size: 12px;\r\n    color: var(--text);\r\n    white-space: nowrap;\r\n    overflow: hidden;\r\n    text-overflow: ellipsis;\r\n    flex: 1;\r\n}'
new_title = b'.saved-thumb .saved-thumb-title {\n    font-size: 13px;\n    font-weight: 500;\n    color: var(--text2);\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    flex: 1;\n    transition: color 0.2s;\n}'.replace(b'\n', b'\r\n')

# Replace hover
old_hover = b'.saved-thumb:hover {\r\n    border-color: var(--red);\r\n    background: var(--red-dim);\r\n}'
new_hover = b'.saved-thumb:hover {\n    background: var(--surface2);\n}\n\n.saved-thumb:hover .saved-thumb-title {\n    color: var(--text);\n}'.replace(b'\n', b'\r\n')

# Replace no-img
old_no_img = b'.saved-thumb > .no-img {\r\n    border-radius: 5px;\r\n    overflow: hidden;\r\n    width: 100%;\r\n    height: 100%;\r\n}'
new_no_img = b'.saved-thumb > .no-img {\n    border-radius: 3px;\n    overflow: hidden;\n    width: 28px;\n    height: 100%;\n}'.replace(b'\n', b'\r\n')

for old, new in [(old_group, new_group), (old_thumb, new_thumb), (old_thumb_img, new_thumb_img), (old_title, new_title), (old_hover, new_hover), (old_no_img, new_no_img)]:
    if old in content:
        content = content.replace(old, new)
        print(f"Replaced {old[:20]}...")
    else:
        print(f"FAILED to find {old[:20]}...")

with open(path, "wb") as f:
    f.write(content)
print("Done")
