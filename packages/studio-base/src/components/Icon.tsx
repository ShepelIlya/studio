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

import { mergeStyleSets } from "@fluentui/react";
import cx from "classnames";
import { CSSProperties } from "react";

import Tooltip, { useTooltip } from "@foxglove/studio-base/components/Tooltip";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

type IconSizeKey = "xlarge" | "large" | "medium" | "small" | "xsmall" | "xxsmall";
type IconSize = [IconSizeKey, number];

const ICON_SIZES: IconSize[] = [
  ["xlarge", 32],
  ["large", 24],
  ["medium", 20],
  ["small", 18],
  ["xsmall", 16],
  ["xxsmall", 11],
];

const classes = mergeStyleSets({
  icon: {
    "> svg": {
      fill: "currentColor",
      width: "1em",
      height: "1em",
      verticalAlign: "text-top",
    },
  },
  clickable: {
    cursor: "pointer",

    ".disabled &": {
      cursor: "unset",
    },
    "[disabled] &": {
      cursor: "unset",
    },
  },
  fade: {
    opacity: 0.6,
    transition: "opacity 0.2s ease-in-out",

    "&:hover": {
      opacity: 0.8,
    },
    "&.active": {
      opacity: 1,
    },
  },
  wrappedIcon: {
    "&:hover": {
      backgroundColor: colors.DARK3,
    },
    "&.active": {
      backgroundColor: colors.DARK4,
    },
  },
  ...ICON_SIZES.reduce((acc, [name, size]) => {
    return {
      ...acc,
      [name]: {
        width: size,
        height: size,
        fontSize: size,
        verticalAlign: "middle",

        img: {
          width: size,
          height: size,
          fontSize: size,
          verticalAlign: "middle",
        },
      },
    };
  }, {}),
});

type Props = {
  children: React.ReactNode;
  active?: boolean;
  fade?: boolean;
  size?: IconSizeKey;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  clickable?: boolean;
  className?: string;
  style?: CSSProperties;
  tooltip?: React.ReactNode;
  tooltipProps?: Partial<React.ComponentProps<typeof Tooltip> & { alwaysShown?: false }>;
  dataTest?: string;
};

const Icon = (props: Props): JSX.Element => {
  const {
    children,
    size,
    onClick,
    clickable,
    active,
    fade,
    className,
    style,
    tooltip,
    tooltipProps,
    dataTest,
  } = props;
  const classNames = cx("icon", classes.icon, className, {
    active,
    [classes.fade]: fade,
    [classes.clickable]: !!onClick || clickable == undefined || clickable,
    [classes.xlarge]: size === "xlarge",
    [classes.large]: size === "large",
    [classes.medium]: size === "medium",
    [classes.small]: size === "small",
    [classes.xsmall]: size === "xsmall",
    [classes.xxsmall]: size === "xxsmall",
  });

  // if we have a click handler
  // cancel the bubbling on the event and process it
  // in our click handler callback; otherwise, let it bubble
  const clickHandler = (e: React.MouseEvent<HTMLElement>) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }
  };

  const { ref: tooltipRef, tooltip: tooltipNode } = useTooltip({
    contents: tooltip,
    ...tooltipProps,
  });

  return (
    <span
      ref={tooltipRef}
      className={classNames}
      onClick={clickHandler}
      style={style}
      data-test={dataTest}
    >
      {children}
      {tooltipNode}
    </span>
  );
};

Icon.displayName = "Icon";

export const WrappedIcon = (props: Props): JSX.Element => {
  return (
    <Icon
      {...props}
      style={{
        display: "block",
        padding: "10px",
        minHeight: "40px",
        minWidth: "40px",
        ...props.style,
      }}
      className={cx(classes.wrappedIcon, props.className)}
    />
  );
};

WrappedIcon.displayName = "Icon";

export default Icon;
