#!/usr/bin/python

import sys, os

def create(path):
  base = "html/"
  for root, subdirs, files in os.walk(path):
    try:
      root = "http://" + root.split('html/', 1)[1]
    except IndexError:
      continue
    [ fp.write(os.path.join(root, f) + '\n') for f in files ]

def start():
  if __name__ == '__main__':
    if len(sys.argv) < 2:
      print "Usage: python urlmap.py [html_directory]"
      exit(-1)
    path = os.path.abspath(sys.argv[1])
    fp = open('urlmap.txt', 'wb')
    create(path)
    fp.close()

start()