#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CreativeBriefStack } from '../src/lib/creative-brief-stack';

const app = new cdk.App();

new CreativeBriefStack(app, 'CreativeBriefStack', {
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'] || 'us-east-1'
  },
  description: 'Creative Brief Intelligence API - AI-powered creative brief analysis'
});

app.synth();