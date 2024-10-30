import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class CodePipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create artifact bucket
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'pipeline-with-codebuild',
      artifactBucket: artifactBucket,
    });

    // Source output artifact
    const sourceOutput = new codepipeline.Artifact('SourceOutput');

    // Build output artifact
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // Create CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'my-build-project',
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
        privileged: true, // Needed if you plan to use Docker
      },
      environmentVariables: {
        NODE_ENV: {
          value: 'production'
        },
        // Add other environment variables as needed
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install'
            ]
          },
          build: {
            commands: [
              'npm run build',
              'npm run test'
            ]
          }
        },
        artifacts: {
          files: [
            '**/*'
          ]
        },
        cache: {
          paths: [
            'node_modules/**/*'
          ]
        }
      })
    });

    // Add Source Stage
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: 'Source',
          owner: 'your-github-username',
          repo: 'your-repo-name',
          branch: 'main',
          connectionArn: 'your-codestar-connection-arn', // Replace with your CodeStar connection ARN
          output: sourceOutput,
        })
      ],
    });

    // Add Build Stage
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Build',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Add Deploy Stage (example with S3 deployment)
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.S3DeployAction({
          actionName: 'Deploy',
          input: buildOutput,
          bucket: artifactBucket,
        }),
      ],
    });

    // Add CloudWatch Events Rule to monitor pipeline status
    const rule = new cdk.aws_events.Rule(this, 'PipelineStatusRule', {
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
        detail: {
          pipeline: [pipeline.pipelineName]
        }
      }
    });

    // Output the pipeline ARN
    new cdk.CfnOutput(this, 'PipelineArn', {
      value: pipeline.pipelineArn,
      description: 'The ARN of the pipeline'
    });

    // Output the artifact bucket ARN
    new cdk.CfnOutput(this, 'ArtifactBucketArn', {
      value: artifactBucket.bucketArn,
      description: 'The ARN of the artifact bucket'
    });
  }
}