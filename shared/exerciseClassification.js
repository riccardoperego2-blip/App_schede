"use strict";
/**
 * Exercise classification + catalog types (schede_biomech_v1)
 * Auto-generated enums mirror scripts/gen_exercise_catalog.py — edit script + re-run to extend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIOMECHANICAL_TAG_CATEGORIES = exports.EXERCISE_CLASSIFICATION_VERSION = void 0;
exports.isCatalogTag = isCatalogTag;
exports.EXERCISE_CLASSIFICATION_VERSION = 'schede_biomech_v1';
/**
 * Tag vocabulary (open set). Grouped for UX filters / AI program generation.
 * New exercises may introduce new strings; validate in app layer if you need a closed set.
 */
exports.BIOMECHANICAL_TAG_CATEGORIES = {
    kinematics: [
        'knee_dominant',
        'hip_dominant',
        'vertical_pulling',
        'horizontal_pull',
        'pressing',
        'unilateral',
        'axial_load',
        'overhead_stability',
    ],
    context: ['home_gym', 'calisthenics', 'machine_based', 'competition_lift', 'conditioning_metcon'],
    loading_physiology: ['time_under_tension', 'constant_tension', 'accommodating_resistance', 'isometric_endurance'],
    coaching: ['warmup_activation', 'shoulder_health', 'spinal_unload', 'weak_point', 'skill_progression'],
};
function isCatalogTag(x) {
    return typeof x === 'string' && x.length > 0 && /^[a-z0-9_]+$/.test(x);
}
