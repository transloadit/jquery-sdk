#!/bin/bash
# With this helper you can upload SSL certificates to IAM
# after which you can link them to a CloudFront Distribution.
#
# Can be cleaned up but this should function more as a manual
# as this only needs to be done every 1 or 2 years.
set -x
set -e

brew install aws-iam-tools

export JAVA_HOME="$(/usr/libexec/java_home --request)"
export AWS_IAM_HOME="/usr/local/opt/aws-iam-tools/jars"
export AWS_CREDENTIAL_FILE=$HOME/.aws-credentials-master

if [ ! -f "${AWS_CREDENTIAL_FILE}" ]; then
	echo "AWSAccessKeyId=$(s3cmd --dump-config |egrep ^access_key | awk '{print $NF}')" > "${AWS_CREDENTIAL_FILE}"
	echo "AWSSecretKey=$(s3cmd --dump-config |egrep ^secret_key | awk '{print $NF}')" >> "${AWS_CREDENTIAL_FILE}"
	chmod 600 "${AWS_CREDENTIAL_FILE}"
fi

iam-servercertupload \
 -b ~/workspace/transloadit-crm/envs/production/ssl/public_transloadit.com.crt \
 -k ~/workspace/transloadit-crm/envs/production/ssl/private_transloadit.com.pem \
 -c ~/workspace/transloadit-crm/envs/production/ssl/bundle_gd_bundle.crt \
 -s transloadit-com \
 -p /cloudfront/path \
 -v 

iam-servercertgetattributes -s transloadit-com

echo ""
echo "The certicifacte is uploaded to AIM. "
echo "Now link the transloadit-com certificate to the d309ve6olj5bd5 cloudfront distribution"
echo "at https://console.aws.amazon.com/cloudfront/home?region=us-east-1#"
