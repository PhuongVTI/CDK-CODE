#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NewCdkTestStack } from '../lib/new-cdk-test-stack';
import { CodePipelineStack } from '../lib/code-pipeline-stack';
import { EventBridgeStack } from '../lib/eventbridge-stack';

const app = new cdk.App();
new NewCdkTestStack(app, 'NewCdkTestStack');
new CodePipelineStack(app, 'CodePipelineStack');
new EventBridgeStack(app, 'EventBridgeStack');