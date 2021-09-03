// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Stack, IButtonStyles, useTheme } from "@fluentui/react";
import { merge } from "lodash";
import { MutableRefObject, useCallback, useMemo, useRef, useState } from "react";

import { compare } from "@foxglove/rostime";
import HoverableIconButton from "@foxglove/studio-base/components/HoverableIconButton";
import KeyListener from "@foxglove/studio-base/components/KeyListener";
import MessageOrderControls from "@foxglove/studio-base/components/MessageOrderControls";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import {
  jumpSeek,
  DIRECTION,
} from "@foxglove/studio-base/components/PlaybackControls/sharedHelpers";
import PlaybackSpeedControls from "@foxglove/studio-base/components/PlaybackSpeedControls";
import { useTooltip } from "@foxglove/studio-base/components/Tooltip";

import PlaybackTimeDisplay from "./PlaybackTimeDisplay";
import RepeatAdapter from "./RepeatAdapter";
import Scrubber from "./Scrubber";

const selectPause = (ctx: MessagePipelineContext) => ctx.pausePlayback;
const selectPlay = (ctx: MessagePipelineContext) => ctx.startPlayback;
const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;

const selectIsPlaying = (ctx: MessagePipelineContext) =>
  ctx.playerState.activeData?.isPlaying === true;
const selectIsActive = (ctx: MessagePipelineContext) => !!ctx.playerState.activeData;
const selectPlayer = (ctx: MessagePipelineContext) => ctx.playerState;

// Select an item from the message pipeline by ref. Use this if you want to consume
// the latest value from the message pipeline within a callback. This avoids listing the item
// within the callback dependencies which causes the callback to be re-created
//
// NOTE: Using a pipeline ref will prevent your component render from triggering on changes.
function usePipelineRef<T>(
  selector: (ctx: MessagePipelineContext) => T,
): MutableRefObject<T | undefined> {
  const valRef = useRef<T | undefined>();
  useMessagePipeline(
    useCallback(
      (ctx) => {
        valRef.current = selector(ctx);
        return undefined;
      },
      [selector],
    ),
  );
  return valRef;
}

export default function PlaybackControls(): JSX.Element {
  const theme = useTheme();
  const [repeat, setRepeat] = useState(false);

  const pause = useMessagePipeline(selectPause);
  const play = useMessagePipeline(selectPlay);
  const seek = useMessagePipeline(selectSeek);

  const player = usePipelineRef(selectPlayer);
  const isActive = useMessagePipeline(selectIsActive);
  const isPlaying = useMessagePipeline(selectIsPlaying);

  const resumePlay = useCallback(() => {
    const {
      startTime: start,
      endTime: end,
      currentTime: current,
    } = player.current?.activeData ?? {};
    // if we are at the end, we need to go back to start
    if (current && end && start && compare(current, end) >= 0) {
      seek(start);
    }
    play();
  }, [play, player, seek]);

  const toggleRepeat = useCallback(() => {
    setRepeat((old) => !old);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resumePlay();
    }
  }, [pause, resumePlay, isPlaying]);

  const keyDownHandlers = useMemo(
    () => ({
      " ": togglePlayPause,
      ArrowLeft: (ev: KeyboardEvent) => {
        if (!player.current?.activeData?.currentTime) {
          return;
        }
        seek(jumpSeek(DIRECTION.BACKWARD, player.current.activeData?.currentTime, ev));
      },
      ArrowRight: (ev: KeyboardEvent) => {
        if (!player.current?.activeData?.currentTime) {
          return;
        }
        seek(jumpSeek(DIRECTION.FORWARD, player.current.activeData?.currentTime, ev));
      },
    }),
    [player, seek, togglePlayPause],
  );

  const loopTooltip = useTooltip({ contents: "Loop playback" });
  const seekBackwardTooltip = useTooltip({ contents: "Seek backward" });
  const seekForwardTooltip = useTooltip({ contents: "Seek forward" });

  const iconButtonStyles: IButtonStyles = {
    icon: { height: 20 },
    root: {
      margin: 0, // Remove this when global.scss goes away
      color: theme.semanticColors.buttonText,
    },
    rootChecked: {
      color: theme.palette.themePrimary,
      backgroundColor: "transparent",
    },
    rootCheckedHovered: { color: theme.palette.themePrimary },
    rootHovered: { color: theme.semanticColors.buttonTextHovered },
    rootPressed: { color: theme.semanticColors.buttonTextPressed },
  };

  const seekIconButttonStyles = ({
    left = false,
    right = false,
  }: {
    left?: boolean | undefined;
    right?: boolean | undefined;
  }) =>
    ({
      root: {
        background: theme.semanticColors.buttonBackgroundHovered,
        ...(left && {
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }),
        ...(right && {
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }),
      },
      rootHovered: {
        background: theme.semanticColors.buttonBackgroundPressed,
      },
    } as IButtonStyles);

  return (
    <div>
      {loopTooltip.tooltip}
      {seekBackwardTooltip.tooltip}
      {seekForwardTooltip.tooltip}
      <RepeatAdapter
        play={play}
        pause={pause}
        seek={seek}
        repeatEnabled={repeat}
        isPlaying={isPlaying}
      />
      <KeyListener global keyDownHandlers={keyDownHandlers} />
      <Stack
        horizontal
        verticalAlign="center"
        tokens={{
          childrenGap: theme.spacing.s1,
          padding: theme.spacing.s1,
        }}
      >
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: theme.spacing.s1 }}>
          <MessageOrderControls />
          <PlaybackSpeedControls />
        </Stack>
        <Stack
          horizontal
          verticalAlign="center"
          styles={{ root: { flex: 1 } }}
          tokens={{
            childrenGap: theme.spacing.s1,
            padding: `0 ${theme.spacing.s2}`,
          }}
        >
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: theme.spacing.s2 }}>
            <HoverableIconButton
              elementRef={loopTooltip.ref}
              checked={repeat}
              disabled={!isActive}
              onClick={toggleRepeat}
              iconProps={{
                iconName: repeat ? "LoopFilled" : "Loop",
                iconNameActive: "LoopFilled",
              }}
              styles={merge(iconButtonStyles, {
                rootDisabled: { background: "transparent" },
              })}
            />
            <HoverableIconButton
              disabled={!isActive}
              onClick={isPlaying ? pause : resumePlay}
              iconProps={{
                iconName: isPlaying ? "Pause" : "Play",
                iconNameActive: isPlaying ? "PauseFilled" : "PlayFilled",
              }}
              styles={merge(iconButtonStyles, {
                rootDisabled: { background: "transparent" },
              })}
            />
          </Stack>
          <Stack
            horizontal
            grow={1}
            verticalAlign="center"
            styles={{ root: { height: "28px", position: "relative" } }}
          >
            <Scrubber onSeek={seek} />
          </Stack>
          <PlaybackTimeDisplay onSeek={seek} onPause={pause} />
        </Stack>
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 2 }}>
          <HoverableIconButton
            elementRef={seekBackwardTooltip.ref}
            iconProps={{ iconName: "Previous", iconNameActive: "PreviousFilled" }}
            disabled={!isActive}
            onClick={() => {
              if (!player.current?.activeData?.currentTime) {
                return;
              }
              seek(jumpSeek(DIRECTION.BACKWARD, player.current.activeData?.currentTime));
            }}
            styles={merge(seekIconButttonStyles({ left: true }), iconButtonStyles)}
          />
          <HoverableIconButton
            elementRef={seekForwardTooltip.ref}
            iconProps={{ iconName: "Next", iconNameActive: "NextFilled" }}
            disabled={!isActive}
            onClick={() => {
              if (!player.current?.activeData?.currentTime) {
                return;
              }
              seek(jumpSeek(DIRECTION.FORWARD, player.current.activeData?.currentTime));
            }}
            styles={merge(seekIconButttonStyles({ right: true }), iconButtonStyles)}
          />
        </Stack>
      </Stack>
    </div>
  );
}
