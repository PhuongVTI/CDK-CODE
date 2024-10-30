import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';

export class EventBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tạo một Rule trong EventBridge
    const rule = new events.Rule(this, 'Rule', {
      eventPattern: {
        source: ['aws.cloudwatch'],
        detailType: ['AWS API Call via CloudTrail'],
        detail: {
          eventSource: ['monitoring.amazonaws.com'],
          eventName: ['PutMetricData'],
        },
      },
    });

  }
}
