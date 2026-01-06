/**
 * AWS CDK Stack for 1000words infrastructure.
 *
 * Resources:
 * - S3 bucket for story file storage
 * - DynamoDB table for story metadata
 * - Lambda function for SvelteKit SSR
 * - API Gateway for HTTP routing
 * - CloudFront distribution for CDN
 */

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";

export interface ThousandWordsStackProps extends cdk.StackProps {
  /** Domain name for the application (optional) */
  domainName?: string;
}

export class ThousandWordsStack extends cdk.Stack {
  /** S3 bucket for story storage */
  public readonly storageBucket: s3.Bucket;

  /** DynamoDB table for story metadata */
  public readonly storiesTable: dynamodb.Table;

  /** Lambda function for SSR */
  public readonly ssrFunction: lambda.Function;

  /** API Gateway HTTP API */
  public readonly httpApi: apigateway.HttpApi;

  /** CloudFront distribution */
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: ThousandWordsStackProps) {
    super(scope, id, props);

    // S3 bucket for story file storage
    this.storageBucket = new s3.Bucket(this, "StorageBucket", {
      bucketName: `1000words-stories-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          // Move old versions to Glacier after 90 days
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          // Delete old versions after 365 days
          noncurrentVersionExpiration: cdk.Duration.days(365),
        },
      ],
    });

    // S3 bucket for static assets
    const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      bucketName: `1000words-assets-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // DynamoDB table for story metadata
    this.storiesTable = new dynamodb.Table(this, "StoriesTable", {
      tableName: "1000words-stories",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI for querying by author
    this.storiesTable.addGlobalSecondaryIndex({
      indexName: "authorDid-publishedAt-index",
      partitionKey: {
        name: "authorDid",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "publishedAt",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying by publish date (for homepage listing)
    this.storiesTable.addGlobalSecondaryIndex({
      indexName: "status-publishedAt-index",
      partitionKey: {
        name: "status",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "publishedAt",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Lambda function for SvelteKit SSR
    this.ssrFunction = new lambda.Function(this, "SsrFunction", {
      functionName: "1000words-ssr",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../..", "build")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
        STORAGE_BUCKET: this.storageBucket.bucketName,
        DYNAMODB_TABLE: this.storiesTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      architecture: lambda.Architecture.ARM_64,
    });

    // Grant Lambda access to S3 and DynamoDB
    this.storageBucket.grantReadWrite(this.ssrFunction);
    this.storiesTable.grantReadWriteData(this.ssrFunction);

    // HTTP API Gateway
    this.httpApi = new apigateway.HttpApi(this, "HttpApi", {
      apiName: "1000words-api",
      description: "1000words HTTP API",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowHeaders: ["*"],
      },
    });

    // Lambda integration
    const lambdaIntegration =
      new apigatewayIntegrations.HttpLambdaIntegration(
        "SsrIntegration",
        this.ssrFunction
      );

    // Route all requests to Lambda
    this.httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigateway.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    this.httpApi.addRoutes({
      path: "/",
      methods: [apigateway.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "1000words CDN",
      defaultBehavior: {
        origin: new origins.HttpOrigin(
          `${this.httpApi.apiId}.execute-api.${this.region}.amazonaws.com`
        ),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors: {
        "/static/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "/_app/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.httpApi.url || "",
      description: "HTTP API URL",
    });

    new cdk.CfnOutput(this, "DistributionUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "StorageBucketName", {
      value: this.storageBucket.bucketName,
      description: "S3 bucket for story storage",
    });

    new cdk.CfnOutput(this, "StoriesTableName", {
      value: this.storiesTable.tableName,
      description: "DynamoDB table for story metadata",
    });
  }
}
