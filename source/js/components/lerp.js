// bare-bones linear interpolation function
export default function lerp(start, end, factor) {
    return start * (1 - factor) + end * factor;
}
