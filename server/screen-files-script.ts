export const SCREEN_FILES_SCRIPT = String.raw`
import base64, json, os, stat, sys, secrets
root, relative, action = sys.argv[1:4]
private = '.crybot-secrets' in relative.split('/')
flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
path_flags = os.O_PATH | os.O_DIRECTORY | os.O_NOFOLLOW
os.umask(0o007)

def directory(parent, name, create=False, open_flags=flags):
    if create:
        try: os.mkdir(name, 0o700 if private else 0o770, dir_fd=parent)
        except FileExistsError: pass
    child = os.open(name, open_flags, dir_fd=parent)
    if create and private: os.fchmod(child, 0o700)
    os.close(parent)
    return child

try:
    fd = os.open('/', path_flags)
    root_parts = root.strip('/').split('/')
    for index, part in enumerate(root_parts):
        fd = directory(fd, part, open_flags=flags if index == len(root_parts) - 1 else path_flags)
    if action in ('readMany', 'writeStream'):
        base = fd
        def streamed_entries():
            while True:
                line = sys.stdin.buffer.readline(65537)
                if not line: return
                if len(line) > 65536 or not line.endswith(b'\n'): raise ValueError('invalid header')
                yield json.loads(line)
        request = json.load(sys.stdin) if action == 'readMany' else None
        result = []
        total = 0
        for entry in request['entries'] if request is not None else streamed_entries():
            path = entry['path']
            parts = path.split('/')
            if not path or path.startswith('/') or any(p in ('', '.', '..') for p in parts): raise ValueError('invalid path')
            private = '.crybot-secrets' in parts
            fd = os.dup(base)
            try:
                for part in parts[:-1]: fd = directory(fd, part, action == 'writeStream')
                name = parts[-1]
                if action == 'readMany':
                    item = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
                    with os.fdopen(item, 'rb') as stream:
                        info = os.fstat(stream.fileno())
                        if not stat.S_ISREG(info.st_mode): raise ValueError('not a file')
                        maximum = min(request['maxFileBytes'], request['maxBytes'] - total)
                        if info.st_size > maximum: raise OverflowError('too large')
                        data = stream.read(maximum + 1)
                        if len(data) > maximum: raise OverflowError('too large')
                    total += len(data)
                    result.append(base64.b64encode(data).decode('ascii'))
                elif entry['type'] == 'directory':
                    child = directory(os.dup(fd), name, True)
                    os.close(child)
                else:
                    temp = '.crybot-write-' + secrets.token_hex(16)
                    try:
                        if entry['type'] == 'link': os.symlink(entry['link'], temp, dir_fd=fd)
                        elif entry['type'] == 'file':
                            mode = entry['mode']
                            remaining = entry['size']
                            if not isinstance(remaining, int) or remaining < 0: raise ValueError('invalid size')
                            if not isinstance(mode, int) or mode < 0 or mode > 0o777 or not mode & 0o400: raise ValueError('invalid mode')
                            out = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode, dir_fd=fd)
                            with os.fdopen(out, 'wb') as stream:
                                while remaining:
                                    chunk = sys.stdin.buffer.read(min(remaining, 1024 * 1024))
                                    if not chunk: raise ValueError('incomplete file')
                                    stream.write(chunk)
                                    remaining -= len(chunk)
                                os.fchmod(stream.fileno(), mode)
                        else: raise ValueError('invalid entry')
                        os.replace(temp, name, src_dir_fd=fd, dst_dir_fd=fd)
                    finally:
                        try: os.unlink(temp, dir_fd=fd)
                        except FileNotFoundError: pass
            finally: os.close(fd)
        print(json.dumps(result))
        sys.exit(0)
    parts = relative.split('/') if relative else []
    for part in parts[:-1]:
        fd = directory(fd, part, action == 'write')
    name = parts[-1] if parts else '.'
    if action == 'remove':
        os.unlink(name, dir_fd=fd)
    elif action == 'write':
        mode = int(sys.argv[4])
        temp = '.crybot-write-' + secrets.token_hex(16)
        out = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode, dir_fd=fd)
        try:
            with os.fdopen(out, 'wb') as stream:
                stream.write(sys.stdin.buffer.read())
                os.fchmod(stream.fileno(), mode)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp, name, src_dir_fd=fd, dst_dir_fd=fd)
        finally:
            try: os.unlink(temp, dir_fd=fd)
            except FileNotFoundError: pass
    else:
        item = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        info = os.fstat(item)
        if action == 'tree':
            entries = []
            def walk(parent, path, depth):
                info = os.fstat(parent)
                kind = 'file' if stat.S_ISREG(info.st_mode) else 'directory'
                entries.append({'path': path, 'type': kind, 'size': info.st_size, 'mtimeMs': info.st_mtime_ns / 1000000})
                if len(entries) > 100000 or depth > 32: raise OverflowError('tree too large')
                if kind == 'directory':
                    for name in sorted(os.listdir(parent)):
                        child_path = path + '/' + name if path else name
                        info = os.stat(name, dir_fd=parent, follow_symlinks=False)
                        if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                            entries.append({'path': child_path, 'type': 'link' if stat.S_ISLNK(info.st_mode) else 'other', 'size': info.st_size, 'mtimeMs': info.st_mtime_ns / 1000000})
                            continue
                        child = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
                        try: walk(child, child_path, depth + 1)
                        finally: os.close(child)
            walk(item, '', 0)
            print(json.dumps(entries))
        elif action == 'stat':
            if not (stat.S_ISREG(info.st_mode) or stat.S_ISDIR(info.st_mode)):
                raise ValueError('not a file or directory')
            print(json.dumps({'size': info.st_size, 'isFile': stat.S_ISREG(info.st_mode)}))
        elif action == 'list':
            print(json.dumps(os.listdir(item)))
        elif action == 'read':
            maximum = int(sys.argv[4])
            if not stat.S_ISREG(info.st_mode): raise ValueError('not a regular file')
            if info.st_size > maximum: raise OverflowError('file exceeds size limit')
            with os.fdopen(item, 'rb') as stream:
                data = stream.read(maximum + 1)
            if len(data) > maximum: raise OverflowError('file exceeds size limit')
            sys.stdout.buffer.write(data)
except FileNotFoundError:
    if action == 'stat': print('null')
    else: sys.exit(44)
except OverflowError:
    sys.exit(43)
except Exception:
    sys.exit(42)
`;
