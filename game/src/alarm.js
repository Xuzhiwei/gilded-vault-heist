// Gilded Vault Heist: the alarm meter.
// One job: climb while any guard or camera sees the thief, fall back while hidden,
// and say when the meter is full (the job is blown and the thief is caught).
import { ALARM_DECAY, ALARM_MAX, ALARM_RISE_CAMERA, ALARM_RISE_GUARD, clamp } from './config.js';

export function createAlarm() {
  return { value: 0, spotted: false, spottedBy: null };
}

/**
 * One step. `seen` names what sees the thief right now ('guard', 'camera' or null).
 * Returns true the moment the meter fills.
 */
export function updateAlarm(alarm, dt, seen) {
  alarm.spotted = seen !== null;
  alarm.spottedBy = seen;
  if (seen === 'guard') alarm.value += ALARM_RISE_GUARD * dt;
  else if (seen === 'camera') alarm.value += ALARM_RISE_CAMERA * dt;
  else alarm.value -= ALARM_DECAY * dt;
  alarm.value = clamp(alarm.value, 0, ALARM_MAX);
  return alarm.value >= ALARM_MAX;
}
