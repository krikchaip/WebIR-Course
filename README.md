# WebIR-Course
01204453 Course From Kasetsart University

## Installation
    git clone --branch Reranking https://github.com/krikchaip/WebIR-Course.git
    npm install

## urlmap.txt
    node urlmap [...html folder's path from crawler project] > urlmap.txt

## webgraph.txt
    node webgraph < urlmap.txt > webgraph.txt

## page_scores.txt
    node page_scores < webgraph.txt > page_scores.txt

or...

## Build documents data
    node documents [...html folder's path from crawler project]