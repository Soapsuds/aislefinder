from grocery_organizer.src.core.models import FullProduct

# TODO need to consider output_format option in main
class OutputFormatter:
    def __init__(self, products:[FullProduct]):
        self.products=products

    def format_output(self):
        formatted_string = 'Original Input' + '\t' + 'Aisle Number' + '\t' + 'Found Product' + '\n'
        for product in self.products:
            formatted_line = product.input_name + '\t' + product.found_product + '\t' + product.aisle_number + '\n'
            formatted_string += formatted_line

        return formatted_string