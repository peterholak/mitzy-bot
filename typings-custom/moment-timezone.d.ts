// Only contains stuff I actually use in this project...
declare module 'moment-timezone' {
    import moment = require('moment')

    interface Zone {
        name: any
        abbrs: any
        untils: any
        offsets: any
        population: any
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
        (date?: any): moment.Moment & Tz
        tz: TzStatic
    }

    const momentTz: MomentTz
    export = momentTz
}
