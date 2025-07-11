#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RallyUXRStack } from '../src/stacks/rallyuxr-stack';

const app = new cdk.App();

new RallyUXRStack(app, 'RallyUXRStack', {
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'] || 'us-east-1'
  },
  description: 'RallyUXR Application - Complete infrastructure stack for UX research platform'
});

app.synth();