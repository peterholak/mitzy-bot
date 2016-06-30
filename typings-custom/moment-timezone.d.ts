// Only contains stuff I actually use in this project...
declare module 'moment-timezone' {
    import moment = require('moment')

    interface Zone {
        name
        abbrs
        untils
        offsets
        population
    }

    interface Tz {
        tz(): string
        tz(zoneName: string): moment.Moment & Tz
    }

    interface TzStatic {
        (zoneName: string): moment.Moment & Tz
        zone(name: string): Zone
        names(): string[]
    }

    interface MomentTz {
        (date?): moment.Moment & Tz
        tz: TzStatic
    }

    const momentTz: MomentTz
    export = momentTz
}
