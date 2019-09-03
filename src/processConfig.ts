import ConfigInterface from "./ConfigInterface";

export default function processConfig(config: ConfigInterface) {
    const overrides: {[key: string]: string} = {};
    for (let i=1; i<process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg === '--set' && i < process.argv.length - 2) {
            overrides[process.argv[i + 1]] = process.argv[i + 2];
            i += 2;
        }
    }

    Object.keys(overrides).forEach(key => {
        // we don't need no jsonpath library...
        let parent: any = config
        const parts = key.split('.')
        const lastPart = parts.pop()!
        for (let part of parts) {
            parent = parent[part]
        }
        parent[lastPart] = coerceValue(overrides[key], parent[lastPart])
    })

    return config
}

// Try to match the type of the original value, if it fits
function coerceValue(newValue: string, originalValue: any) {
    if (typeof originalValue === 'number') {
        const value = parseInt(newValue)
        return isNaN(value) ? newValue : value
    }

    if (typeof originalValue === 'object') {
        return JSON.parse(newValue)
    }

    return newValue
}
