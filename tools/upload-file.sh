#!/bin/bash
# Uploads an asset to s3 & cloudfront. Shows headers on S3 and CloudFront.
# Also shows md5sum of all different endpoints
set -e

# Set magic variables for current FILE & DIR
__FILE__="$(test -L "$0" && readlink "$0" || echo "$0")"
__DIR__="$(cd "$(dirname "${__FILE__}")"; echo $(pwd);)"
__ROOT__="$(cd "$(dirname "${__DIR__}")"; echo $(pwd);)"


sourcepath="${1}"
destpath="${2}"

if [ -z "${sourcepath}" ]; then
	echo "First argument should be source path. e.g. build/js/jquery.transloadit2-lastest.js"
	exit 1
fi
if [ -z "${destpath}" ]; then
	echo "Second argument should be destination path. e.g. js/jquery.transloadit2-lastest.js"
	exit 1
fi

echo ""
echo ""
echo "Uploading ${sourcepath} to ${destpath}: "
echo "==========================================================================="
pushd ${__DIR__}
	[ -f s3cmd-1.1.0-beta3.tar.gz ] || wget https://pypi.python.org/packages/source/s/s3cmd/s3cmd-1.1.0-beta3.tar.gz
	[ -d s3cmd-1.1.0-beta3 ] || tar zxvf s3cmd-1.1.0-beta3.tar.gz
	s3cmd-1.1.0-beta3/s3cmd put \
		${sourcepath} \
		s3://assets.transloadit.com/${destpath} \
		--no-progress \
		--mime-type=application/x-javascript \
		--add-header=Cache-Control:max-age=60 \
		--add-header=Cache-Control:must-revalidate \
		--acl-public \
		--cf-invalidate \
		--no-encrypt \
		--force
	sleep 3
popd


echo ""
echo ""
echo "S3 headers: "
echo "==========================================================================="
curl -s -D- -o/dev/null http://assets.transloadit.com.s3.amazonaws.com/${destpath} |sort

echo ""
echo ""
echo "CloudFront headers: "
echo "==========================================================================="
curl -s -D- -o/dev/null http://d309ve6olj5bd5.cloudfront.net/${destpath} |sort

echo ""
echo ""
echo "Compare md5"
echo "==========================================================================="
echo "$(cat ${sourcepath} |md5) for ${sourcepath}"
echo "$(curl -s http://assets.transloadit.com.s3.amazonaws.com/${destpath} |md5) for http://assets.transloadit.com.s3.amazonaws.com/${destpath}"
echo "$(curl -s http://assets.transloadit.com/${destpath} |md5) for http://assets.transloadit.com/${destpath}"
echo "$(curl -s http://assetscf.transloadit.com/${destpath} |md5) for http://assetscf.transloadit.com/${destpath}"
echo "$(curl -s http://d309ve6olj5bd5.cloudfront.net/${destpath} |md5) for http://d309ve6olj5bd5.cloudfront.net/${destpath}"
echo "$(curl -s https://assets.transloadit.com/${destpath} |md5) for https://assets.transloadit.com/${destpath}"
echo "$(curl -s https://assetscf.transloadit.com/${destpath} |md5) for https://assetscf.transloadit.com/${destpath}"
echo "$(curl -s https://d309ve6olj5bd5.cloudfront.net/${destpath} |md5) for https://d309ve6olj5bd5.cloudfront.net/${destpath}"

