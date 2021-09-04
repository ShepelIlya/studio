// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PrimaryButton, Stack, Text, useTheme } from "@fluentui/react";
import { useCallback, useState } from "react";
import { useLocalStorage } from "react-use";

import { Session } from "@foxglove/studio-base/services/ConsoleApi";

import AccountSyncGraphic from "./AccountSyncGraphic";
import DeviceCodeDialog from "./DeviceCodeDialog";

export default function SigninForm(): JSX.Element {
  const theme = useTheme();
  const [_, setBearerToken] = useLocalStorage<string>("fox.bearer-token");
  const [modalOpen, setModalOpen] = useState(false);

  const handleOnSigninClick = useCallback(() => setModalOpen(true), []);

  const onClose = useCallback(
    (session?: Session) => {
      setModalOpen(false);
      if (session != undefined) {
        setBearerToken(session.bearer_token);
        window.location.reload();
      }
    },
    [setBearerToken],
  );

  return (
    <>
      {modalOpen && <DeviceCodeDialog onClose={onClose} />}
      <Stack tokens={{ childrenGap: theme.spacing.l1 }} styles={{ root: { lineHeight: "1.3" } }}>
        <Stack
          horizontal
          horizontalAlign="center"
          styles={{ root: { color: theme.palette.accent } }}
        >
          <AccountSyncGraphic width={192} />
        </Stack>
        <Text variant="mediumPlus">
          Sign in to Foxglove to access collaboration features like shared layouts.
        </Text>

        <PrimaryButton
          text="Sign in"
          onClick={handleOnSigninClick}
          styles={{
            root: {
              marginLeft: 0,
              marginRight: 0,
            },
          }}
        />
      </Stack>
    </>
  );
}
