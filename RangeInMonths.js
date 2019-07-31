const moment = require('moment')

/**
 * Iterator which returns a series of month long periods within the specified range (inclusive). 
 * The first date will be the start param, final day of the final period will be the end param. 
 * The last period will be less than one month if the range does not divide evenly into months. 
 *
 * @param {Date} Start - The first day in the range to be divided into months
 * @param {Date} End - The last day in the range to be divided into months
 * @return {Dictionary} Period - Returns a series of dictionaries containing 
 *                    {
 *                       {Date} start - First day of this month,
 *                       {Date} end - Last day of this month 
 *                    }
 *
 * @example
 * // 
 * for (const month of new RangeInMonths(DateOfBirth, today)) {
 *    console.log(`First day: ${month.start}, Last day: ${month.end}`);
 *  }
 */
module.exports = class RangeInMonths {
    constructor(start, end) {
        this.start = moment(start);
        this.last = moment(end);
        this.monthCounter =  0;
        }
    [Symbol.iterator]() {
        return {
            next: () => {
                var current_start = this.start.clone().add(this.monthCounter, 'months')
                var current_end = this.start.clone().add(this.monthCounter + 1, 'months')
                this.monthCounter = this.monthCounter + 1;
                if(current_end <= this.last)
                    return {
                        value: {start: current_start, end: current_end}, 
                        done: false
                    }
                else if(current_start <= this.last)
                    return {
                        value: {start: current_start, end: this.last}, 
                        done: false
                    }
                else return {
                    done: true
                }
            }
        }
    }
}
