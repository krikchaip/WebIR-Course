#! python2
#!/usr/bin/env python

import os

global relation, error_check, a

error_check = pow(10,-15) 
a = 0.85

def pagerank(relation):
	global a
	n = len(relation)
	check = True
	old = []
	new = []

	# start val
	val = 1.0/(n-1)
	for i in range(n):
		old.append(0)
		new.append(val)

	time = 1

	while(check):
		for i in range(1,n):
			old[i] = new[i]
			new[i] = 0

		for i in range(1,n):
			if len(relation[i]) != 0:
				val = old[i]/len(relation[i])
				for x in relation[i]:
					new[x] += val

		for i in range(1,n):
			new[i] *= a
			new[i] += (1.0-a)/(n-1)

		print 'Round : ',time
		time +=1
		check = check_error(old, new)
	return new

def writefile(page_scores):
	filename = './page_scores.txt'
	if not os.path.exists(os.path.dirname(filename)):
		try:
			os.makedirs(os.path.dirname(filename))
		except OSError as exc: # Guard against race condition
			if exc.errno != errno.EEXIST:
				raise

	with open(filename, 'wb') as f:
		for item in page_scores[1:]:
			try:
				print>>f, '%.16f'%item
			except Exception as e:
				err =1

def readfile():
	global relation
	relation = []
	relation.append([])
	filename = './webgraph.txt'
	if not os.path.exists(os.path.dirname(filename)):
		try:
			os.makedirs(os.path.dirname(filename))
		except OSError as exc:
			if exc.errno != errno.EEXIST:
				raise

	if os.path.isfile(filename):
		with open(filename) as f:
			items = f.read().splitlines()
		for item in items:
			buf = []
			for x in item.split(',')[:-1]:
				buf.append(int(x))
			relation.append(buf)

def check_error(old, new):
	global error_check
	check = False
	n = len(old)
	num = 0
	buf = [0]

	for i in range(1,n):
		if abs(new[i]-old[i]) > error_check:
			buf.append([i,abs(new[i]-old[i])])
			num += 1
			check = True
	buf[0] = num
	if num < 15:
		print 'error check (',error_check,') :',buf
	else:
		print 'error check (',error_check,') :',num
	return check

readfile()
page_scores = pagerank(relation)
writefile(page_scores)