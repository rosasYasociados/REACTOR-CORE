"""Genera el index.html autosuficiente (CSS y JS incrustados) a partir de src/.
Uso opcional:  python3 build.py   -> sobrescribe ./index.html"""
import re, pathlib
src = pathlib.Path(__file__).parent / 'src'
html = (src / 'index.html').read_text(encoding='utf8')
css = (src / 'css' / 'style.css').read_text(encoding='utf8')
html = re.sub(r'<link rel="stylesheet" href="css/style.css">', lambda m: '<style>\n' + css + '\n</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>',
              lambda m: '<script>\n' + (src / m.group(1)).read_text(encoding='utf8') + '\n</script>', html)
(pathlib.Path(__file__).parent / 'index.html').write_text(html, encoding='utf8')
print('index.html generado:', len(html), 'bytes')
