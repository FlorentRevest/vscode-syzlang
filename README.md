# VSCode - Syzlang syntax highlighting

![Screenshot](/screenshot.png?raw=true "Screenshot")

This extension provides syntax highlighting for syzkaller syscall descriptions
in VSCode (.txt extensions).

By default, it will match any file whose path matches `**/sys/*/*.txt` but you
can match other files by adding file associations to your `settings.json`, e.g:

```
"files.associations": {
  "*.txt": "syzlang"
},
```

Note that this currently does not highlight "syzprog" files (.syz extensions)
nor *.txt.const nor *.txt.warn.