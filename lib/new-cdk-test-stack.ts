// lib/cloudwatch-alarms-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { CloudWatchClient, ListMetricsCommand, DescribeAlarmsForMetricCommand } from '@aws-sdk/client-cloudwatch';

interface MetricInfo {
  namespace: string;
  metricName: string;
  dimensions?: { name: string; value: string; }[];
}

export class NewCdkTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Khởi tạo CloudWatch client
    const client = new CloudWatchClient({});

    // Gọi hàm khởi tạo async
    this.initializeAlarms(client);
  }

  private async initializeAlarms(client: CloudWatchClient) {
    try {
      const metrics = await this.getAllMetrics(client);
      const metricsWithoutAlarms = await this.filterMetricsWithoutAlarms(client, metrics);
      this.createAlarms(metricsWithoutAlarms);
    } catch (error) {
      console.error('err mess:', error);
    }
  }

  private async getAllMetrics(client: CloudWatchClient): Promise<MetricInfo[]> {
    const metrics: MetricInfo[] = [];
    let nextToken: string | undefined;

    try {
      do {
        const command = new ListMetricsCommand({
          NextToken: nextToken
        });

        const response = await client.send(command);
        
        if (response.Metrics) {
          for (const metric of response.Metrics) {
            if (metric.Namespace && metric.MetricName) {
              metrics.push({
                namespace: metric.Namespace,
                metricName: metric.MetricName,
                dimensions: metric.Dimensions?.map(d => ({
                  name: d.Name!,
                  value: d.Value!
                }))
              });
            }
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

      return metrics;
    } catch (error) {
      console.error('Error when getting metrics list:', error);
      return [];
    }
  }

  private async filterMetricsWithoutAlarms(
    client: CloudWatchClient,
    metrics: MetricInfo[]
  ): Promise<MetricInfo[]> {
    const metricsWithoutAlarms: MetricInfo[] = [];

    for (const metric of metrics) {
      try {
        const command = new DescribeAlarmsForMetricCommand({
          MetricName: metric.metricName,
          Namespace: metric.namespace,
          Dimensions: metric.dimensions?.map(d => ({
            Name: d.name,
            Value: d.value
          }))
        });

        const response = await client.send(command);

        if (!response.MetricAlarms || response.MetricAlarms.length === 0) {
          metricsWithoutAlarms.push(metric);
        }
      } catch (error) {
        console.error(`Lỗi khi kiểm tra alarm cho metric ${metric.namespace}/${metric.metricName}:`, error);
      }
    }

    return metricsWithoutAlarms;
  }

  private createAlarms(metrics: MetricInfo[]) {
    // Khởi tạo SNS Topic ARN để gửi thông báo
    const snsTopicArn = 'arn:aws:sns:ap-northeast-1:115099063324:AlarmContextToolDLQ';
    const snsTopic = sns.Topic.fromTopicArn(this, 'AlarmContextToolDLQ', snsTopicArn);

    for (const metric of metrics) {
      try {
        const alarm = new cloudwatch.Alarm(this, `${metric.namespace}-${metric.metricName}-Alarm`, {
          metric: new cloudwatch.Metric({
            namespace: metric.namespace,
            metricName: metric.metricName,
            statistic: 'Sum'
          }),
          evaluationPeriods: 1,
          threshold: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          actionsEnabled: true,
          alarmDescription: `Alarm for ${metric.namespace}/${metric.metricName}`
        });

        // Thêm hành động gửi thông báo đến SNS Topic
        alarm.addAlarmAction(new cloudwatch_actions.SnsAction(snsTopic));

        console.log(`Create alarm for metric: ${metric.namespace}/${metric.metricName}`);
      } catch (error) {
        console.error(`Error create alarm at metric ${metric.namespace}/${metric.metricName}:`, error);
      }
    }
  }
}
