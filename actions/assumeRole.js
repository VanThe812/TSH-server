// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from "url";
import AWS from "aws-sdk";

// snippet-start:[javascript.v3.sts.actions.AssumeRole]
import { AssumeRoleCommand } from "@aws-sdk/client-sts";

import { client } from "../lib/client.js";

export const main = async () => {
  try {
    // Returns a set of temporary security credentials that you can use to
    // access Amazon Web Services resources that you might not normally
    // have access to.
    const command = new AssumeRoleCommand({
      // The Amazon Resource Name (ARN) of the role to assume.
      RoleArn: "arn:aws:iam::940873232125:role/roleAnywhereS3andIoT",
      // An identifier for the assumed role session.
      RoleSessionName: "session1",
      // The duration, in seconds, of the role session. The value specified
      // can range from 900 seconds (15 minutes) up to the maximum session
      // duration set for the role.
      DurationSeconds: 900,
    });
    const response = await client.send(command);

    AWS.config.update({
      accessKeyId: response.Credentials.AccessKeyId,
      secretAccessKey: response.Credentials.SecretAccessKey,
      sessionToken: response.Credentials.SessionToken,
      region: "ap-southeast-1",
    });
    console.log(response);
  } catch (err) {
    console.error(err);
  }
};
// snippet-end:[javascript.v3.sts.actions.AssumeRole]

// Invoke main function if this file was run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
