import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';

interface EventBridgeStackProps extends cdk.StackProps {
  pipeline: codepipeline.Pipeline;
}

export class EventBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
    super(scope, id, props);

    const { pipeline } = props;

    // Tạo một Rule trong EventBridge
    const rule = new events.Rule(this, 'Rule', {
      ruleName: 'cloudwatch-metric-pipeline-trigger',
      description: 'Triggers pipeline when new CloudWatch metrics arrive',
      eventPattern: {
        source: ['aws.cloudwatch'],
        detailType: ['CloudWatch Metric Stream'],
        detail: {
          eventSource: ['monitoring.amazonaws.com'],
          eventName: ['PutMetricData'],
        },
      },
    });

    const eventBridgeRole = new iam.Role(this, 'EventBridgeRole', {
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      description: 'Role for EventBridge to start CodePipeline',
    });

    eventBridgeRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['codepipeline:StartPipelineExecution'],
        resources: [pipeline.pipelineArn],
        effect: iam.Effect.ALLOW,
      })
    );
  }
}
