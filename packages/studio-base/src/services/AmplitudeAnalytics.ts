// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { addBreadcrumb as addSentryBreadcrumb, setUser as setSentryUser } from "@sentry/core";
import { Severity } from "@sentry/types";
import amplitude from "amplitude-js";
import { v4 as uuidv4 } from "uuid";

import Logger from "@foxglove/log";
import OsContextSingleton from "@foxglove/studio-base/OsContextSingleton";
import IAnalytics, {
  AppEvent,
  getEventBreadcrumbType,
  getEventCategory,
} from "@foxglove/studio-base/services/IAnalytics";
import Storage from "@foxglove/studio-base/util/Storage";

const UUID_ZERO = "00000000-0000-0000-0000-000000000000";
const USER_ID_KEY = "analytics_user_id";

const log = Logger.getLogger(__filename);

const os = OsContextSingleton; // workaround for https://github.com/webpack/webpack/issues/12960

export class AmplitudeAnalytics implements IAnalytics {
  private _amplitude: Promise<amplitude.AmplitudeClient | undefined>;
  private _crashReporting: boolean;
  private _storage = new Storage();

  constructor(options: {
    optOut?: boolean;
    crashReportingOptOut: boolean;
    amplitudeApiKey: string | undefined;
  }) {
    const amplitudeApiKey = options.amplitudeApiKey;
    const optOut = options.optOut ?? false;

    if (!optOut && amplitudeApiKey != undefined && amplitudeApiKey.length > 0) {
      this._amplitude = this.createAmplitude(amplitudeApiKey);
    } else {
      this._amplitude = Promise.resolve(undefined);
    }

    this._crashReporting = !(options.crashReportingOptOut ?? false);
    if (this._crashReporting) {
      this.getDeviceId()
        .then((deviceId) => {
          const id = this.getUserId();
          setSentryUser({ id, deviceId });
        })
        .catch((err) => {
          log.error("getDeviceId error:", err);
        });
    } else {
      log.info("Crash reporting is disabled");
    }

    void this.logEvent(AppEvent.APP_INIT);
  }

  private async createAmplitude(apiKey: string): Promise<amplitude.AmplitudeClient> {
    const userId = this.getUserId();
    const deviceId = await this.getDeviceId();
    const appVersion = this.getAppVersion();
    log.info(
      `Initializing telemetry as user ${userId}, device ${deviceId} (version ${appVersion})`,
    );

    const amp = amplitude.getInstance();
    amp.init(apiKey);
    amp.setUserId(userId);
    amp.setDeviceId(deviceId);
    amp.setVersionName(appVersion);

    return amp;
  }

  getAppVersion(): string {
    return os?.getAppVersion() ?? "0.0.0";
  }

  getUserId(): string {
    let userId = this._storage.getItem<string>(USER_ID_KEY);
    if (userId == undefined) {
      userId = uuidv4();
      this._storage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  }

  // OsContextSingleton.getMachineId() can take 500-2000ms on macOS
  async getDeviceId(): Promise<string> {
    return (await os?.getMachineId()) ?? UUID_ZERO;
  }

  async logEvent(event: AppEvent, data?: { [key: string]: unknown }): Promise<void> {
    const amp = await this._amplitude;
    if (amp != undefined) {
      await new Promise<void>((resolve) => {
        amp.logEvent(event, data, () => resolve());
      });
    }

    // important that this happens after await amplitude (after setSentryUser() call)
    if (this._crashReporting) {
      addSentryBreadcrumb({
        type: getEventBreadcrumbType(event),
        category: `studio.${getEventCategory(event).toLowerCase()}`,
        message: event,
        level: Severity.Info,
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }
}
