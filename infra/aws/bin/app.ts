#!/usr/bin/env node
/**
 * CDK App entry point for 1000words AWS infrastructure.
 */

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ThousandWordsStack } from "../lib/stack";

const app = new cdk.App();

new ThousandWordsStack(app, "ThousandWordsStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  description: "1000words - Human-written story sharing platform",
});

app.synth();
