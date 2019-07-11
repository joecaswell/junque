#!/usr/bin/env python3
from __future__ import print_function
import pymongo
import bson
from bson import json_util
import json
import zlib
import sys
import argparse
import struct
import collections
from pprint import pprint as pretty_print

class Config:
    parsed = False
    options = {}

    @staticmethod
    def validate_args():
        p = argparse.ArgumentParser()
        p.add_argument('--metadata','-m', action='store_true', help='include metadata')
        p.add_argument('--diagnostics','-d', action='store_true', help='include diagnostic metrics')
        p.add_argument('--from','-f',action='store', help='from datetime')
        p.add_argument('--to','-t', action='store', help='to datetime')
        p.add_argument('--key', '-k', type=str, action='append', help='with -m, limit included keys - may be included multiple times')
        p.add_argument('--count', '-c', action='store', type=int, help='number of results to return')
        p.add_argument('--format', '-fmt', action='store', default='json', help='output format', choices=["j","json","b","binary","p","pretty"])
        p.add_argument('filenames', nargs='*', type=str)
        Config.options = p.parse_args()
        Config.parsed = True
        #for k in Config.keys():
        #    print(k + ": " + str(Config.get(k)))
    
    def __init__():
        raise Exception('Nope')

    @staticmethod
    def keys():
        return Config.options.__dict__.keys()

    @staticmethod
    def get(arg):
        if not Config.parsed:
          Config.validate_args()
        return getattr(Config.options, arg, None)

    @staticmethod
    def has(arg):
        if not Config.parsed:
          Config.validate_args()
        return Config.options.__contains__(arg)

def unpretty_print(b, indent=' '):
    if isinstance(b, dict):
        print()
        for key, value in b.items():
            print(indent, key+": ", end="")
            pretty_print(value, indent+'  ')
    else:
        print(b)
    #    print(repr(b))

def json_print(b):
    print(json.dumps(b, default=bson.json_util.default))

def binary_print(b):
    print("something should go here")

def output_fun():
    if Config.has('format') and Config.get('format') in ['json','j']:
        return json_print
    else:
        if Config.has('format') and Config.get('format') in ['binary','b']:
            return binary_print
        else:
            return pretty_print

def decode_bson_doc(raw, at=0):
    (sz,) = struct.unpack_from("<I",raw)
    return (bson.BSON(raw[:sz]).decode(),raw[sz:])

def keymap(doc, map=None, pref=()):
    if not map:
        map = collections.OrderedDict()
    for k, v in doc.items():
        path = pref + (k,)
        if type(v) == bson.BSON:
            map=keymap(v, map, path)
        else:
            map[k] = v
    return map

def process_file(name):
    output = output_fun()
    limit = Config.get('count')
    metadata_count = 0
    diagnostics_count = 0
    for data in bson.decode_file_iter(open(name, mode='rb')):
        if 'doc' in data:
            if Config.get('metadata'):
              metadata_count += 1
              doc = data['doc']
              if Config.get('key'):
                  resdoc = {}
                  for key in Config.get('key'):
                      doc = data['doc']
                      for k in key.split('.'):
                          doc = doc[k]
                      resdoc[key] = doc
                  doc=resdoc
              output(doc)
        else:
            if Config.get('diagnostics'):
                expanded = zlib.decompress(data['data'][4:])
                (refdoc, restdata) = decode_bson_doc(expanded)
                samples = keymap(refdoc)
                diagnostics_count += 1
                output(samples)
                (nsamples,) = struct.unpack_from("<I",restdata)
                (ndeltas,) = struct.unpack_from("<I",restdata[4:])
                restdata = restdata[8:]


        if limit and limit <= (metadata_count + diagnostics_count):
            break
    print("diagnostics: ",diagnostics_count," metdata: ",metadata_count)

def main():
    for f in Config.get('filenames'):
        process_file(f)

if __name__ == "__main__":
    main()
