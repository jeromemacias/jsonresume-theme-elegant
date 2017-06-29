var fs = require('fs');
var pug = require('pug');
var _ = require('underscore');
var utils = require('jsonresume-themeutils');
var moment = require('moment');
var markdown = require('markdown-it')({
    breaks: true
}).use(require('markdown-it-abbr'));

require('./moment-precise-range.js');
moment.locale('fr');

function getFormattedDate(date, date_format) {
    date_format = date_format || 'MMM YYYY';

    return moment(date).format(date_format);
}

function interpolate(object, keyPath) {
    var keys = keyPath.split('.');

    return _(keys).reduce(function(res, key) {
        return (res || {})[key];
    }, object);
}

function capitalize(str) {
    if (str) {
        str = str.toString();
        return str[0].toUpperCase() + str.slice(1).toLowerCase();
    }

    return str;
}

function convertMarkdown(str) {
    if (str != null) {
        return markdown.render(str);
    }
}

function getFloatingNavItems(resume) {
    var floating_nav_items = [
        {label: 'À propos', target: 'about', icon: 'board', requires: 'basics.summary'},
        {label: 'Expérience professionelle', target: 'work-experience', icon: 'office', requires: 'work'},
        {label: 'Compétences', target: 'skills', icon: 'tools', requires: 'skills'},
        {label: 'Formation', target: 'education', icon: 'graduation-cap', requires: 'education'},
        {label: 'Récompenses', target: 'awards', icon: 'trophy', requires: 'awards'},
        {label: 'Volontariat', target: 'volunteer-work', icon: 'child', requires: 'volunteer'},
        {label: 'Publications', target: 'publications', icon: 'newspaper', requires: 'publications'},
        {label: 'Intérêts', target: 'interests', icon: 'heart', requires: 'interests'},
        {label: 'Références', target: 'references', icon: 'thumbs-up', requires: 'references'}
    ];

    return _(floating_nav_items).filter(function(item) {
        var value = interpolate(resume, item.requires);

        return !_.isEmpty(value);
    });
}

function render(resume) {
    var addressValues = resume.basics.location;
    var css = fs.readFileSync(__dirname + '/assets/css/theme.css', 'utf-8');

    resume.basics.picture = utils.getUrlForPicture(resume);

    resume.basics.summary = convertMarkdown(resume.basics.summary);

    resume.basics.computed_location = addressValues['address'] + ', ' + addressValues['postalCode'] + ' ' + addressValues['city'];

    if (resume.languages) {
        resume.basics.languages = _.pluck(resume.languages, 'language').join(', ');
    }

    _(resume.basics.profiles).each(function(profile) {
        var label = profile.network.toLowerCase();

        profile.url = utils.getUrlForProfile(resume, label);
        profile.label = label;
    });

    resume.basics.top_five_profiles = resume.basics.profiles.slice(0, 5);
    resume.basics.remaining_profiles = resume.basics.profiles.slice(5);

    _.each(resume.work, function(work_info) {
        var start_date = moment(work_info.startDate, "YYYY-MM-DD");
        var end_date = moment(work_info.endDate, "YYYY-MM-DD");
        var can_calculate_period = start_date.isValid() && end_date.isValid();

        if (can_calculate_period) {
            work_info.duration = moment.preciseDiff(start_date, end_date);
        }

        if (start_date.isValid()) {
          work_info.startDate = utils.getFormattedDate(start_date, 'MMM YYYY');
        }

        if (end_date.isValid()) {
          work_info.endDate = utils.getFormattedDate(end_date, 'MMM YYYY');
        }

        work_info.summary = convertMarkdown(work_info.summary);

        work_info.highlights = _(work_info.highlights).map(function(highlight) {
            return convertMarkdown(highlight);
        });
    });

    _.each(resume.skills, function(skill_info) {
        var levels = ['Débutant', 'Intermédiaire', 'Avancé', 'Confirmé'];

        if (skill_info.level) {
            skill_info.skill_class = skill_info.level.toLowerCase();
            skill_info.level = capitalize(skill_info.level.trim());
            skill_info.display_progress_bar = _.contains(levels, skill_info.level);
        }
    });

    _.each(resume.education, function(education_info) {
        _.each(['startDate', 'endDate'], function(type) {
            var date = education_info[type];

            if (date) {
                education_info[type] = getFormattedDate(date);
            }
        });
    });

    _.each(resume.awards, function(award) {
        var date = award.date;

        award.summary = convertMarkdown(award.summary);

        if (date) {
            award.date = getFormattedDate(date, 'DD MMM YYYY');
        }
    });

    _.each(resume.volunteer, function(volunteer_info) {
        volunteer_info.summary = convertMarkdown(volunteer_info.summary);

        _.each(['startDate', 'endDate'], function (type) {
            var date = volunteer_info[type];

            if (date) {
                volunteer_info[type] = getFormattedDate(date, 'DD MMM YYYY');
            }
        });

        volunteer_info.highlights = _(volunteer_info.highlights).map(function(highlight) {
            return convertMarkdown(highlight);
        });
    });

    _.each(resume.publications, function(publication_info) {
        var date = publication_info.releaseDate;

        publication_info.summary = convertMarkdown(publication_info.summary);

        if (date) {
            publication_info.releaseDate = getFormattedDate(date, 'DD MMM YYYY');
        }
    });

    _.each(resume.references, function(reference_info) {
        reference_info.reference = convertMarkdown(reference_info.reference);
    });

    return pug.renderFile(__dirname + '/index.pug', {
      resume: resume,
      floating_nav_items: getFloatingNavItems(resume),
      css: css,
      _: _
    });
}

module.exports = {
    render: render
};
