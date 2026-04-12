import os

path = r"c:\Users\mears\Desktop\others\streambert\src\styles\global.css"
with open(path, "rb") as f:
    content = f.read(20000)
    # look for .sidebar-saved
    pos = content.find(b".sidebar-saved")
    if pos != -1:
        print(f"Found .sidebar-saved at {pos}")
        print("Raw content after it:")
        snippet = content[pos:pos+500]
        print(snippet)
        if b"\t" in snippet:
            print("Found TABS")
        else:
            print("No TABS found")
        if b"\r\n" in snippet:
            print("Found CRLF")
        else:
            print("No CRLF found")
    else:
        print("Not found")
