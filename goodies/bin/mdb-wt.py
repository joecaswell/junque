import struct
import sys
import os
import datetime
import re
import mmap
import zlib
import base64
import signal

try:
    import snappy
except:
    print 'snappy not available, will not print the content of compressed pages'
    snappy = None


#
# pdb interrupt support
#
    
def debug_signal_handler(signal, frame):
    import pdb
    pdb.Pdb(stdout=open("/dev/tty", "w")).set_trace()

signal.signal(signal.SIGINT, debug_signal_handler)



#
# 2.4 for 2.6
#

try:
    from collections import defaultdict
except:
    class defaultdict(dict):
        def __init__(self, default_factory=None, *args, **kwargs):
            dict.__init__(self, *args, **kwargs)
            self.default_factory = default_factory
        def __getitem__(self, key):
            try:
                return dict.__getitem__(self, key)
            except KeyError:
                self[key] = value = self.default_factory()
                return value

def xstruct(s):
    if hasattr(struct, 'Struct'): return struct.Struct(s)
    else: return s

structs = {}

def unpack_from(fmt, buf, start=0):
    if type(fmt)==str:
        if hasattr(struct, 'Struct'):
            if not fmt in structs:
                structs[fmt] = struct.Struct(fmt)
            fmt = structs[fmt]
        else:
            return struct.unpack(fmt, buf[start:start+struct.calcsize(fmt)])
    return fmt.unpack_from(buf, start)  

#
# util
#

def flags_string(strings, flags):
    fs = []
    for i in strings:
        if flags&i:
            fs.append(strings[i])
    return '+'.join(fs)

class indent:
    def __init__(self):
        self._delta = '  '
        self.reset()
        self.p = ''
        self.hidden = 0
    def reset(self):
        self._indent = ''
    def get(self):
        return self._indent
    def set(self, indent):
        self._indent = indent
    def indent(self):
        self._indent += self._delta
    def outdent(self):
        self._indent = self._indent[:-len(self._delta)]
    def pfx(self, p):
        self.p = p
    def hide(self):
        self.hidden += 1
    def show(self):
        self.hidden -= 1
    def prt(self, at=0, s=None):
        if not self.hidden:
            if s:
                print '%s%08x:%s %s' % (self.p, at, self._indent, s)
            else:
                print

indent = indent()

def dbg(*args):
    if do_dbg:
        sys.stdout.write(' '.join(str(a) for a in args) + '\n')


#
# bson
#

def get_char(buf, at):
    return at+1, ord(buf[at])

def get_int(buf, at):
    return at+4, unpack_from('i', buf, at)[0]

def get_cstring(buf, at):
    l = buf.find('\0', at) - at
    return at+l+1, buf[at:at+l]

def info_doc(buf, at):
    at, l = get_int(buf, at)
    return at, ('DOC len=0x%x(%d) EOO=0x%x' % (l, l, at+l-5))

def info_string(buf, at):
    a, l = get_int(buf, at)
    sl = buf.find('\0', a) - a
    info = 'string len=%d strlen=%d' % (l, sl)
    if do_bson_detail:
        #info += ' "' + buf[a:a+l-1] + '"'
        info += ' =' + repr(buf[a:a+l-1])
    if l > 0 and l < 16*1024*1024 and sl < l: pass
    elif sl != l-1: info += ' WARNING: EMBEDDED NULL'
    else: info += ' ERROR: NO NULL'
    return a+l, info


def info_cstring(buf, at):
    a, l = get_char(buf, at)
    info = 'string len=%d' % l
    if do_btree_detail:
        info += ' "' + buf[a:a+l] + '"'
    return a+l, info
    
def info_bindata(buf, at):
    at, l = get_int(buf, at)
    at, sub = get_char(buf, at)
    info = 'bindata len=%d sub=%d' % (l, sub)
    if do_bson_detail:
        for c in buf[at:at+l]:
            info += ' %02x' % ord(c)
        info += ' ' + base64.b64encode(buf[at:at+l])
    return at+l, info

def info_regexp(buf, at):
    at, e = get_cstring(buf, at)
    at, o = get_cstring(buf, at)
    return at, ('regexp len(e)=%d len(o)=%d' % (len(e), len(o)))

def info_basic(name, l, buf, at):
    for i in range(0,l):
        name += ' %02x' % ord(buf[at+i])
    return at+l, name

def info_time(name, l, fmt, scale=1, skip=0):
    def info(buf, at):
        t = unpack_from(fmt, buf, at+skip)[0] / scale
        at, info = info_basic(name, l, buf, at)
        try: t = datetime.datetime.utcfromtimestamp(t).isoformat() + 'Z'
        except Exception, e: t = str(e)
        return at, info + ' =' + t
    return info

def info_double(buf, at):
    d = unpack_from('d', buf, at)[0]
    at, info = info_basic('double', 8, buf, at)
    return at, '%s =%g' % (info, d)

def info_int32(buf, at):
    i = unpack_from('i', buf, at)[0]
    at, info = info_basic('int32', 4, buf, at)
    return at, '%s =%d' % (info, i)

def info_simple(name, l):
    def info(buf, at):
        return info_basic(name, l, buf, at)        
    return info

types = {
    0x01: info_double,
    0x02: info_string,
    0x03: info_doc,
    0x04: info_doc,
    0x05: info_bindata,
    0x06: info_simple('undefined', 0),
    0x07: info_time('objectid', 12, '>i'),
    0x08: info_simple('boolean', 1),
    0x09: info_time('datetime', 8, 'q', scale=1000),
    0x0a: info_simple('null', 0),
    0x0b: info_regexp,
    0x10: info_int32,
    0x11: info_time('timestamp', 8, 'i', skip=4),
    0x12: info_simple('int64', 8),
    0x7f: info_simple('maxkey', 0),
    0xff: info_simple('minkey', 0),
}

def print_bson(buf, at, l=None, null_name=False):
    if l is None:
        at, l = get_int(buf, at)
        end = at + l - 4
    else:
        end = at + l
    while at < end:
        at, t = get_char(buf, at)
        if t==0:
            indent.outdent()
            indent.prt(at, 'EOO')
        else:
            ok = False
            if t in types:
                a, name = get_cstring(buf, at)
                if a<=end and (len(name)>0 or null_name) and len(name)<1000:
                    a, info = types[t](buf, a)
                    if a<=end:
                        indent.prt(at, '%s: %s' % (repr(name), info))
                        if types[t]==info_doc:
                            indent.indent()
                        at = a
                        ok = True
            if not ok:
                indent.prt(at, '? %02x %c' % (t, chr(t)))
    return end


def embedded_bson(buf, at, end, *args, **kwargs):
    if do_extract:
        extracted_bson.write(buf[at:end])
    if do_bson:
        if end-at >= 4:
            at, l = get_int(buf, at)
            i = indent.get()
            indent.indent()
            indent.prt(at, 'DOC len=0x%x(%d) EOO=0x%x' % (l, l, at+l-4))
            #indent.prt(at, 'DOC len=%d' % l)
            indent.indent()
            l -= 4
            print_bson(buf, at, l, *args, **kwargs)
            indent.set(i)
            at += l
        if at < end: # and extra:
            indent.indent()
            indent.prt(at, hexbytes(buf[at:end]))
            indent.outdent()

#
# cells (entries) in a page
#

# cell.i
CELL_SHORT_KEY = 1
CELL_SHORT_KEY_PFX = 2
CELL_SHORT_VALUE = 3

CELL_ADDR_DEL = (0)            # Address: deleted
CELL_ADDR_INT = (1 << 4)       # Address: internal 
CELL_ADDR_LEAF = (2 << 4)      # Address: leaf
CELL_ADDR_LEAF_NO = (3 << 4)   # Address: leaf no overflow
CELL_DEL = (4 << 4)            # Deleted value
CELL_KEY = (5 << 4)            # Key
CELL_KEY_OVFL = (6 << 4)       # Overflow key
CELL_KEY_OVFL_RM = (12 << 4)   # Overflow key (removed)
CELL_KEY_PFX = (7 << 4)        # Key with prefix byte
CELL_VALUE = (8 << 4)          # Value
CELL_VALUE_COPY = (9 << 4)     # Value copy
CELL_VALUE_OVFL = (10 << 4)    # Overflow value
CELL_VALUE_OVFL_RM = (11 << 4) # Overflow value (removed)

# intpack.i
# 10xxxxxx          -> xxxxxx
# 110xxxxx yyyyyyyy -> xxxxxyyyyyyyy + 64
# 1110xxxx ...      -> ...
def unpack_uint(buf, at=0):
    i = ord(buf[at])
    if i&0xC0==0x80: # 1 byte
        return at+1, i&0x3F
    elif i&0xE0==0xC0: # 2 byte
        return at+2, (((i&0x1F)<<8) | ord(buf[at+1])) + 64
    elif i&0xE0==0xE0: # multi-byte
        i &= 0xF
        x = 0
        for j in range(i):
            x = (x<<8) | ord(buf[at+1+j])
        return at+1+i, x + 8192 + 64 # check this
    else:
        raise Exception('unhandled uint 0x%x' % i)

def unhandled_desc(desc):
    raise Exception('unhandled desc=0x%x\n' % desc)        

def hexbytes(content):
    return ' '.join(('%02x' % ord(c)) for c in content)

def record_id(x):
    try:
        _, x = unpack_uint(x)
        return 'pack(' + str(x) + ')'
    except Exception as e:
        return hexbytes(x)
    
# collection, internal, key: record id (maybe partial?)
# collection, leaf, key:     record id
# collection, leaf, value:   bson
# index,      internal, key: bson (mabye compact? maybe partial?)
# index,      leaf, key:     bson (maybe compact?)
# index,      leaf, value:   record id
last_key_content = ''
def cell_kv(desc, buf, at, short, key, find=None, prefix=False):
    global last_key_content
    start = at

    # short
    if short:
        at, sz = at+1, desc >> 2
        info = 'short'
        end = at + sz
        if prefix:
            end += 1
            info += '+pfx'
            pfx_len = ord(buf[at])
            content = last_key_content[0:pfx_len] + buf[at+1:end] 
        else:
            content = buf[at:end]
    

    # long
    else:
        info = 'long'
        pfx_len = 0
        if prefix:
            info += '+pfx'
            at, pfx_len = at+1, ord(buf[at])
        at, sz = unpack_uint(buf, at+1)
        sz += 64
        end = at + sz
        content = last_key_content[0:pfx_len] + buf[at+1:end] 

    if key:
        last_key_content = content
    if is_collection:
        if key:
            x = record_id(content)
            indent.prt(start, 'key desc=0x%x(%s) sz=0x%x(%d) key=%s' % (desc, info, sz, sz, x))
        else:
            indent.prt(start, 'val desc=0x%x(%s) sz=0x%x(%d) end=0x%x' % (desc, info, sz, sz, end))
            embedded_bson(buf, at, end)
    elif is_index:
        if key:
            x = hexbytes(content)
            indent.prt(start, 'key desc=0x%x(%s) sz=0x%x(%d) key=%s'% (desc, info, sz, sz, x))
        else:
            x = hexbytes(content)
            indent.prt(start, 'val desc=0x%x(%s) sz=0x%x(%d) val=%s' % (desc, info, sz, sz, x))
    elif is_sizestorer:
        if key:
            x = repr(content)
            if not x.startswith("'table:"): x = hexbytes(content)
            indent.prt(start, 'key desc=0x%x(%s) sz=0x%x(%d) key=%s' % (desc, info, sz, sz, x))
        else:
            indent.prt(start, 'val desc=0x%x(%s) sz=0x%x(%d)' % (desc, info, sz, sz))
            embedded_bson(buf, at, end)
    elif is_wiredtiger:
        if key:
            x =repr(content)
            indent.prt(start, 'key desc=0x%x(%s) sz=0x%x(%d) key=%s'% (desc, info, sz, sz, x))
        else:
            x = repr(content) if do_value else ''
            indent.prt(start, 'val desc=0x%x(%s) sz=0x%x(%d) %s' % (desc, info, sz, sz, x))
    else:
        if key:
            x = hexbytes(content)
            indent.prt(start, 'key desc=0x%x(%s) sz=0x%x(%d) key=%s'% (desc, info, sz, sz, x))
        else:
            x = hexbytes(content) if do_value else ''
            indent.prt(start, 'val desc=0x%x(%s) sz=0x%x(%d) %s' % (desc, info, sz, sz, x))
    return end, key and content==find, content

def unpack_addr(buf, at):
    at, a1 = unpack_uint(buf, at)
    at, a2 = unpack_uint(buf, at)
    at, a3 = unpack_uint(buf, at)
    return at, (a1, a2, a3)

def fmt_cookie(c):
    return '0x%x,%d,0x%x' % ((c[0]+1)*4096, c[1], c[2]) if c else 'None'

def cell_addr(desc, buf, at, info):
    a, sz = unpack_uint(buf, at+1)
    _, c = unpack_addr(buf, a)
    #x = hexbytes(buf[a:a+sz])
    indent.prt(at, 'val desc=0x%x sz=0x%x(%d) addr=%s' % (desc, sz, sz, fmt_cookie(c)))
    return a + sz, False, None

def cell(buf, at, find=None):
    desc = ord(buf[at])
    if   desc&3==CELL_SHORT_KEY:     return cell_kv(desc, buf, at, short=True, key=True, find=find)
    elif desc&3==CELL_SHORT_VALUE:   return cell_kv(desc, buf, at, short=True, key=False)
    elif desc&3==CELL_SHORT_KEY_PFX: return cell_kv(desc, buf, at, short=True, key=True, find=find, prefix=True)
    #elif desc&3==CELL_SHORT_KEY_PFX: unhandled_desc(desc)
    elif desc==CELL_KEY:             return cell_kv(desc, buf, at, short=False, key=True, find=find)
    elif desc==CELL_KEY_PFX:         return cell_kv(desc, buf, at, short=False, key=True, find=find, prefix=True)
    elif desc==CELL_VALUE:           return cell_kv(desc, buf, at, short=False, key=False)
    elif desc==CELL_ADDR_INT :       return cell_addr(desc, buf, at, 'addr')
    elif desc==CELL_ADDR_LEAF:       return cell_addr(desc, buf, at, 'addr')
    elif desc==CELL_ADDR_LEAF_NO:    return cell_addr(desc, buf, at, 'addr')
    elif desc==CELL_VALUE_OVFL:      return cell_addr(desc, buf, at, 'ovfl')
    else:                            unhandled_desc(desc)

#
# block_desc - 4KB at beginning of file
#

# block.h: WT_BLOCK_DESC, struct __wt_block_desc
block_desc_struct = struct.Struct('< I H H I I')
BLOCK_MAGIC = 120897

def block_desc(buf, at):
    block_desc = buf[at:at+block_desc_struct.size]
    magic, major, minor, cksum, _ = block_desc_struct.unpack(block_desc)
    ok = 'OK' if magic==BLOCK_MAGIC else 'ERROR'
    indent.prt(at, 'block_desc magic=%d(%s) major=%d minor=%d cksum=0x%x' % \
        (magic, ok, major, minor, cksum))
    return at + 4096

#
# block_manager - 4KB at end of file
#

def pair(buf, at):
    at, x = unpack_uint(buf, at)
    at, y = unpack_uint(buf, at)
    return at, x, y
    
def extlist(buf, at):
    at, magic, zero = pair(buf, at)
    dbg('at, magic, zero', at, magic, zero)
    ok = 'OK' if magic==71002 else 'ERROR' # xxx
    indent.prt(at, 'magic=%d(%s) zero=%d' % (magic, ok, zero))
    res = {}
    while True:
        at, off, sz = pair(buf, at)
        indent.prt(at, 'off=0x%x sz=0x%x(%d)' % (off, sz, sz))
        if off==0:
            break
        else:
            res[off] = sz
    return res

#
# page
#

# btmem.h: WT_PAGE_HEADER, struct __wt_page_header
page_header_struct = struct.Struct('< Q Q I I B B 2s')

page_types = {
    0: 'INVALID',        # Invalid page
    1: 'BLOCK_MANAGER',  # Block-manager page
    2: 'COL_FIX',        # Col-store fixed-len leaf
    3: 'COL_INT',        # Col-store internal page
    4: 'COL_VAR',        # Col-store var-length leaf page
    5: 'OVFL',           # Overflow page
    6: 'ROW_INT',        # Row-store internal page
    7: 'ROW_LEAF',       # Row-store leaf page
}

# block.h: WT_BLOCK_HEADER, struct __wt_block_header
block_header_struct = struct.Struct('< I I B 3s')

# snappy_compress.c: length stored at beginning of compressed buffer
snappy_header_struct = struct.Struct('< Q')

def page(buf, at, root, avail, compressor, find=None):

    # sz is relative to this
    start = at
    if do_entry:
        indent.prt()

    # avail?
    if at in avail:
        l = avail[at]
        indent.prt(at, 'AVAIL len=0x%0x(%d)' % (l, l))
        if not do_avail or find: # ensure we skip avail when searching for something
            return at + l, None

    # page header
    page_header = buf[at:at+page_header_struct.size]
    recno, gen, msz, entries, t, pflags, _ = page_header_struct.unpack(page_header)
    ts = page_types[t] if t in page_types else None
    fs = flags_string({1: 'comp', 2: 'all0', 4: 'no0'}, pflags)
    indent.prt(at, 'page recno=%d gen=%d msz=0x%x entries=%d type=%d(%s) flags=0x%x(%s) %s' % \
               (recno, gen, msz, entries, t, ts, pflags, fs, 'ROOT' if at==root else ''))
    at += page_header_struct.size

    # simple sanity check - xxx need better
    valid = ts and recno==0

    # block header
    block_header = buf[at:at+block_header_struct.size]
    sz, cksum, bflags, _ = block_header_struct.unpack(block_header)
    fs = flags_string({1: 'cksum'}, bflags)
    indent.prt(at, 'block sz=0x%x cksum=0x%x flags=0x%x(%s)' % (sz, cksum, bflags, fs))
    at += block_header_struct.size
    
    # decompress
    invalid_at = None
    if pflags & 1 and (do_entry or do_decompress) and not recno:
        if compressor=='snappy' and snappy:
            a = start + 64
            l, = snappy_header_struct.unpack(buf[a:a+snappy_header_struct.size])
            a += snappy_header_struct.size
            buf = buf[at:start+64] + snappy.decompress(buf[a:a+l])
            indent.prt(start+64, 'snappy compressed=%d decompressed=%d' % (l, len(buf)))
            at = 0
            indent.pfx('  ')
        elif compressor=='zlib':
            zlib_error = ''
            try:
                d = zlib.decompressobj()
                buf = buf[at:start+64] + d.decompress(buf[start+64:start+sz])
            except Exception as e:
                res = buf[at:start+64]
                d = zlib.decompressobj()
                try:
                    r = d.decompress(buf[start+64:start+sz], 1)
                    while r:
                        res += r
                        invalid_at = start + sz - len(d.unconsumed_tail)
                        r = d.decompress(d.unconsumed_tail, 1)
                except:
                    pass
                invalid_bytes = buf[invalid_at:]
                buf = res
                zlib_error = 'ERROR: ' + str(e)
            indent.prt(start+64, 'zlib decompressed=%d %s' % (len(buf), zlib_error))
            at = 0
            indent.pfx('  ')

    # entries
    found = False
    if not valid:
        print 'skipping apparently invalid page'
    elif ts=='BLOCK_MANAGER':
        indent.indent()
        if do_block_manager_entry:
            extlist(buf, at)
        indent.outdent()
    elif ts=='ROW_INT' or ts=='ROW_LEAF':
        indent.indent()
        try:
            if do_entry or find:
                for i in range(entries):
                    at, f, content = cell(buf, at, find)
                    if found:
                        return None, content
                    found = f
        except IndexError:
            indent.prt(len(buf), 'ERROR: end of buffer before end of page')
        finally:
            indent.outdent()
    elif ts=='OVFL':
        embedded_bson(buf, at, at+4)
    else:
        print 'unhandled page type'

    # done
    indent.pfx('')
    if invalid_at != None:
        s = 'ERROR: invalid compressed: ' + hexbytes(invalid_bytes[:16])
        indent.prt(invalid_at, s)
    at = start + (sz if valid else 4096) # xxx need better recovery
    return at, None

#
# parse checkpoint metadata
# this gives us the starting points in the file
#

def parse_meta(info):
    pat = 'block_compressor=([a-z]*).*'
    pat += 'checkpoint=\(WiredTigerCheckpoint\.[0-9]+=\('
    pat += 'addr="([0-9a-f]+)".*?time=([0-9]+).*?write_gen=([0-9]+)'
    m = re.search(pat, info)
    if not m:
        print 'no addr info; no data or no checkpoint?'
        return None, None, None
    compressor = m.group(1)
    print 'checkpoint time', datetime.datetime.utcfromtimestamp(int(m.group(3))).isoformat() + 'Z'
    print 'write gen', int(m.group(4))
    addr = m.group(2)
    dbg('addr', addr)
    buf = ''.join(chr(int(addr[i:i+2],16)) for i in range(0, len(addr), 2))
    at = 0
    at, version = at+1, buf[at]
    at, root = unpack_addr(buf, at)
    at, alloc = unpack_addr(buf, at)
    at, avail = unpack_addr(buf, at)
    at, discard = unpack_addr(buf, at)
    at, fsz = unpack_uint(buf, at)
    at, ckptsz = unpack_uint(buf, at)
    #at, gen = unpack_uint(buf, at) # ???
    #print ord(version), root, alloc, avail, discard, fsz, ckptsz
    return root, alloc, avail, compressor

def print_file(fn, at, meta, find=None):

    global is_collection, is_index, is_sizestorer, is_wiredtiger
    is_collection = 'collection-' in fn or '_mdb_catalog' in fn
    is_sizestorer = 'sizeStorer' in fn
    is_index = 'index-' in fn
    is_wiredtiger = 'WiredTiger.wt' in fn

    # mmap file
    print fn
    f = open(fn, 'rb')
    sz = os.fstat(f.fileno()).st_size # 2.4 won't accept 0
    buf = mmap.mmap(f.fileno(), sz, prot=mmap.PROT_READ)

    # get root and avail if possible from meta string xxx check this
    root = None
    avail = {}
    compressor = default_compressor # default in case metadata not available
    if meta:
        try:
            r, u, a, compressor = parse_meta(meta)
            print '%s: r=%s u=%s a=%s' % (fn, fmt_cookie(r), fmt_cookie(u), fmt_cookie(a))
            if r:
                root = (r[0]+1) * 4096
            if a:
                if not do_dbg: indent.hide()
                a = (a[0]+1) * 4096
                avail = extlist(buf, a+block_header_struct.size+page_header_struct.size)
                if not do_dbg: indent.show()
        except Exception as e:
            if not do_dbg: indent.show()
            if do_dbg: print e
            print 'problem reading extlist for %s at %x, proceeding without avail list' % (fn, a)

    # print the page(s)
    if at==0 or do_pages:
        if at==0:
            at = block_desc(buf, at)
        while at < len(buf):
            at, found = page(buf, at, root, avail, compressor, find)
            if found:
                return found
    else:
        page(buf, at, root, avail, compressor)


def find_key(dbpath, fn, meta, key):
    indent.hide()
    fn = os.path.join(dbpath, fn)
    found = print_file(fn, 0, meta, find=key)
    indent.show()
    return found

def print_with_meta(fn, at):
    dbpath = os.path.dirname(fn)
    meta = None
    exc = None
    while True:
        try:
            meta = open(os.path.join(dbpath, 'WiredTiger.turtle')).read()
            if os.path.basename(fn) != 'WiredTiger.wt':
                f = fn[len(dbpath)+1 if dbpath else 0 : ]
                meta = find_key(dbpath, 'WiredTiger.wt', meta, 'file:%s\x00' % f)
            break
        except Exception as e:
            exc = e
        if not '/' in dbpath:
            break
        dbpath = dbpath.rsplit('/', 1)[0]
    if not meta:
        if exc:
            print 'metadata not available:', exc
        print 'proceeding without metadata; all pages, including available pages, will be printed'
    print_file(fn, at, meta)

#
#
#

print '===', ' '.join(sys.argv[0:])

# what to do
do_pages = 'q' in sys.argv[1]
do_page = 'p' in sys.argv[1] or do_pages
do_entry = 'e' in sys.argv[1]
do_block_manager_entry = do_entry or 'm' in sys.argv[1]
do_bson = 'b' in sys.argv[1] or 'B' in sys.argv[1]
do_bson_detail = 'B' in sys.argv[1]
do_value = 'v' in sys.argv[1]
do_avail = 'f' in sys.argv[1]
do_dbg = 'd' in sys.argv[1]
do_decompress = 'z' in sys.argv[1]
do_extract = 'x' in sys.argv[1] or 'X' in sys.argv[1]
do_extract_append = 'X' in sys.argv[1]

if do_extract:
    mode = 'a' if do_extract_append else 'w'
    extracted_bson = open(sys.argv[-1], mode)

#if do_collection:
#    pass
if do_page:
    fn = sys.argv[2]
    at = int(sys.argv[3], 0) if len(sys.argv)>3 else 0
    default_compressor = sys.argv[4] if len(sys.argv)>4 else 'snappy'
    print_with_meta(fn, at)
