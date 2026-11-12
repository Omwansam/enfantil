/** "Me · Wanjiru" for the mother, "Amani" for a child. */
export function profileName(profile) {
  return profile.isMe ? `Me · ${profile.firstName}` : profile.firstName
}

/** "26 weeks pregnant" for the mother, "9 months" for a child. */
export function profileDetail(profile) {
  return profile.isMe ? profile.statusLabel : profile.age
}

/** "you" for the mother, "Amani" for a child — for sentences like "Booking for you". */
export function profileWho(profile) {
  return profile.isMe ? 'you' : profile.firstName
}
