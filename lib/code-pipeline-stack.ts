import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class CodePipelineStack extends cdk.Stack {

  public readonly pipeline: codepipeline.Pipeline;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create artifact bucket
    const artifactBucket = new s3.Bucket(this, 'PipelineArtifactsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Source output artifact
    const sourceOutput = new codepipeline.Artifact('SourceOutput');

    // Build output artifact
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // Create CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      projectName: 'my-build-project',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      environmentVariables: {
        NODE_ENV: {
          value: 'production'
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install'
            ]
          },
          synth: {
            commands: [
              'cdk synth'
            ]
          },
          build: {
            commands: [
              'cdk deploy new-cdk-test-stack'
            ]
          }
        },
        artifacts: {
          'base-directory': 'dist',
          files: '**/*'
        },
        cache: {
          paths: [
            'node_modules/**/*'
          ]
        }
      })
    });

     // Create Pipeline
    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'pipeline-with-codebuild',
      artifactBucket: artifactBucket,
    });

    // Add Source Stage
    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.GitHubSourceAction({
          actionName: 'GitHub_Source',
          owner: 'PhuongVTI', 
          repo: 'CDK-CODE', 
          oauthToken: cdk.SecretValue.plainText('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'), 
          output: sourceOutput,
          branch: 'main', 
        })
      ],
    });

    // Add Build Stage
    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'CodeBuild',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });
  }
}